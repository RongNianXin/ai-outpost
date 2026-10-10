"""Validate and package ONLY static public site output. Never package the workspace."""
import argparse
import hashlib
import pathlib
import re
import tarfile

EXTENSIONS = {'.html', '.txt', '.md', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico', '.woff', '.woff2', '.ttf'}
MAX_BYTES = 500 * 1024 * 1024

def check_name(name):
    p = pathlib.PurePosixPath(name)
    if '\\' in name or ':' in name or p.is_absolute() or '..' in p.parts:
        raise ValueError('Unsafe archive path')
    if any(part.startswith('.') for part in p.parts) and name != '.nojekyll':
        raise ValueError('Hidden files are not public site output')
    if name != '.nojekyll' and p.suffix.lower() not in EXTENSIONS:
        raise ValueError('Unsupported public output extension: ' + name)
    if p.suffix.lower() == '.md' and not re.fullmatch(r'issues/[a-z0-9-]+/brief\.md', name):
        raise ValueError('Only the public inspiration download may be Markdown')
    if p.parts[0] in {'content', 'exports', 'ops', 'docs', 'scripts', 'lib', 'tests', 'node_modules', '每一期底稿'}:
        raise ValueError('Source or local records in public bundle')

def check_text(name, data):
    if pathlib.PurePosixPath(name).suffix.lower() not in {'.html', '.txt', '.md', '.js', '.css', '.svg'}:
        return
    text = data.decode('utf-8', errors='replace')
    if re.search(r'(?:[A-Za-z]:[\\/](?:Users|vibeCodeing)|\.local/source-library|\.private/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,})', text):
        raise ValueError('Private path or credential marker in public output: ' + name)

def validate(archive, slug):
    names=set()
    size=0
    with tarfile.open(archive, 'r:gz') as tar:
        for item in tar.getmembers():
            # No links, devices, directories, repeated paths or executable payloads.
            if not item.isfile() or item.name in names:
                raise ValueError('Archive must contain unique regular files only')
            check_name(item.name)
            size += item.size
            if size > MAX_BYTES or len(names) >= 20000:
                raise ValueError('Site output exceeds the deployment limit')
            data=tar.extractfile(item).read()
            check_text(item.name, data)
            names.add(item.name)
    for required in ['index.html', 'archive/index.html', 'about/index.html', f'issues/{slug}/index.html', f'issues/{slug}/brief.md']:
        if required not in names:
            raise ValueError('Required public page missing: ' + required)
    return len(names),size

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source', type=pathlib.Path)
    parser.add_argument('--archive', required=True, type=pathlib.Path)
    parser.add_argument('--slug', required=True)
    parser.add_argument('--sha256')
    parser.add_argument('--extract', type=pathlib.Path)
    args=parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',args.slug):
        raise ValueError('Invalid issue slug')
    if args.source:
        if args.source.name != 'out' or args.source.is_symlink():
            raise ValueError('Source must be the static out directory')
        files=sorted(args.source.rglob('*'))
        if any(f.is_symlink() for f in files):
            raise ValueError('No symlinks in static output')
        args.archive.parent.mkdir(parents=True,exist_ok=True)
        with tarfile.open(args.archive,'w:gz') as tar:
            for f in files:
                if f.is_file():
                    name=f.relative_to(args.source).as_posix()
                    check_name(name)
                    check_text(name,f.read_bytes())
                    tar.add(f,arcname=name,recursive=False)
    digest=hashlib.sha256(args.archive.read_bytes()).hexdigest()
    if args.sha256 and digest != args.sha256:
        raise ValueError('Deployment bundle SHA256 mismatch')
    count,size=validate(args.archive,args.slug)
    if args.extract:
        if args.extract.exists():
            raise ValueError('Extraction requires a fresh directory')
        with tarfile.open(args.archive,'r:gz') as tar:
            tar.extractall(args.extract,filter='data')
    print(f'Public site bundle PASS: {count} files, {size} bytes, SHA256 {digest}')

if __name__ == '__main__':
    main()
