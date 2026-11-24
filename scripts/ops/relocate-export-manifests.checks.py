import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("relocate", Path(__file__).with_name("relocate-export-manifests.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RelocationChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="outpost-relocation-")
        self.base = Path(self.temp.name)
        self.old = self.base / "old-device"
        self.root = self.base / "new-device"
        self.primary = "exports/publish/sample/manifest.json"
        self.child = "exports/xiaohongshu/sample/manifest.json"
        self.asset = "exports/xiaohongshu/sample/02.png"
        self.files = {
            self.primary: json.dumps({"files": {"xiaohongshuManifest": str(self.old / self.child), "xiaohongshuImages": [str(self.old / self.asset)]}}).encode(),
            self.child: json.dumps({"uploadOrder": [{"path": str(self.old / self.asset)}]}).encode(),
            self.asset: b"synthetic-reviewed-image",
        }
        self.save()

    def save(self):
        for relative, data in self.files.items():
            p = self.root / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        self.inventory = self.base / "inventory.json"
        self.inventory.write_text(json.dumps({"worktrees": [{"path": str(self.old), "files": [{"path": p, "sha256": hashlib.sha256(b).hexdigest()} for p, b in self.files.items()]}]}), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def run_relocation(self, apply=False):
        return module.relocate(self.inventory, self.root, [self.primary], apply)

    def test_dry_run_leaves_all_bytes_unchanged(self):
        result = self.run_relocation()
        self.assertEqual(len(result["changedManifests"]), 2)
        for p, b in self.files.items():
            self.assertEqual((self.root / p).read_bytes(), b)
        self.assertFalse((self.root / ".local").exists())

    def test_apply_updates_nested_paths_and_keeps_originals(self):
        result = self.run_relocation(True)
        value = json.loads((self.root / self.primary).read_text(encoding="utf-8"))
        self.assertEqual(value["files"]["xiaohongshuImages"], [str(self.root / self.asset)])
        child = json.loads((self.root / self.child).read_text(encoding="utf-8"))
        self.assertEqual(child["uploadOrder"][0]["path"], str(self.root / self.asset))
        for p in [self.primary, self.child]:
            self.assertEqual((Path(result["backup"]) / p).read_bytes(), self.files[p])
        self.assertEqual((self.root / self.asset).read_bytes(), self.files[self.asset])

    def test_missing_asset_prevents_all_writes(self):
        (self.root / self.asset).unlink()
        with self.assertRaises(FileNotFoundError):
            self.run_relocation(True)
        self.assertEqual((self.root / self.primary).read_bytes(), self.files[self.primary])

    def test_changed_asset_is_rejected(self):
        (self.root / self.asset).write_bytes(b"unreviewed-change")
        with self.assertRaises(ValueError):
            self.run_relocation(True)
        self.assertFalse((self.root / ".local").exists())

    def test_traversal_is_rejected(self):
        self.files[self.primary] = json.dumps({"path": str(self.old) + "/exports/../secret"}).encode()
        self.save()
        with self.assertRaises(ValueError):
            self.run_relocation(True)

    def test_other_absolute_root_is_rejected(self):
        self.files[self.primary] = json.dumps({"path": str(self.base / "outside/secret")}).encode()
        self.save()
        with self.assertRaises(ValueError):
            self.run_relocation(True)

    def test_changed_manifest_cannot_be_reapplied_with_old_inventory(self):
        self.run_relocation(True)
        with self.assertRaises(ValueError):
            self.run_relocation(True)


if __name__ == "__main__":
    unittest.main()
