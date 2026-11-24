"""Relocate reviewed export manifests only after checking a private file inventory."""
import argparse
import hashlib
import json
import ntpath
import os
from pathlib import Path, PurePosixPath
import uuid


def relocate(inventory_path, restored_root, selected=None, apply=False):
    inventory = json.loads(Path(inventory_path).read_text(encoding="utf-8-sig"))
    original = inventory["worktrees"][0]
    old_root = original["path"].replace("\\", "/").rstrip("/")
    expected = {row["path"]: row["sha256"] for row in original["files"]}
    requested_root = Path(restored_root).absolute()
    if requested_root.is_symlink() or (hasattr(requested_root, "is_junction") and requested_root.is_junction()):
        raise ValueError("Restored root must not be linked")
    root = requested_root.resolve(strict=True)
    pending = list(selected or [p for p in expected if p.startswith("exports/") and p.endswith("/manifest.json")])
    verified = {}
    planned = {}

    def checked_file(relative):
        parts = PurePosixPath(relative).parts
        if not parts or parts[0] != "exports" or any(p in ("..", ".") for p in parts) or "\\" in relative or ":" in relative:
            raise ValueError("Path is outside exports: " + relative)
        p = root.joinpath(*parts)
        for parent in [p, *p.parents]:
            if parent == root:
                break
            if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
                raise ValueError("Linked export paths are not supported: " + relative)
        if not p.resolve().is_relative_to(root / "exports"):
            raise ValueError("Resolved path is outside exports: " + relative)
        if relative not in verified:
            data = p.read_bytes()
            if relative not in expected or hashlib.sha256(data).hexdigest() != expected[relative]:
                raise ValueError("Missing inventory entry or changed file: " + relative)
            verified[relative] = data
        return p

    def transform(value):
        if isinstance(value, dict):
            return {k: transform(v) for k, v in value.items()}
        if isinstance(value, list):
            return [transform(v) for v in value]
        if not isinstance(value, str):
            return value
        normalized = value.replace("\\", "/")
        prefix = old_root + "/"
        if normalized.casefold().startswith(prefix.casefold()):
            relative = normalized[len(prefix):]
            target = checked_file(relative)
            if relative.endswith("/manifest.json") and relative not in planned:
                pending.append(relative)
            return str(target)
        if ntpath.isabs(value):
            raise ValueError("Unrecognized absolute path in manifest")
        return value

    while pending:
        relative = pending.pop(0)
        if relative in planned:
            continue
        if not relative.endswith("/manifest.json"):
            raise ValueError("Select an export manifest.json")
        checked_file(relative)
        # Mark before visiting references so manifest cycles cannot loop.
        planned[relative] = None
        data = json.loads(verified[relative].decode("utf-8-sig"))
        planned[relative] = (json.dumps(transform(data), ensure_ascii=False, indent=2) + "\n").encode("utf-8")

    changes = {p: data for p, data in planned.items() if data != verified[p]}
    backup = None
    if apply and changes:
        for relative, data in verified.items():
            if checked_file(relative).read_bytes() != data:
                raise ValueError("File changed during validation: " + relative)
        backup = root / ".local" / "export-path-backups" / uuid.uuid4().hex
        for parent in [backup.parent, backup.parent.parent]:
            if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
                raise ValueError("Backup directory must not be linked")
        for relative in changes:
            p = backup / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(verified[relative])
        for relative, data in changes.items():
            target = root / relative
            temporary = target.with_name(target.name + ".relocate-" + uuid.uuid4().hex)
            temporary.write_bytes(data)
            os.replace(temporary, target)
    return {"mode": "apply" if apply else "dry_run", "verifiedFiles": len(verified), "changedManifests": list(changes), "backup": str(backup) if backup else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--root", required=True)
    parser.add_argument("--manifest", action="append")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(json.dumps(relocate(args.inventory, args.root, args.manifest, args.apply), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
