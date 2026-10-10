import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('bundle',Path(__file__).with_name('pages-bundle.py'))
bundle=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)

class BundleTests(unittest.TestCase):
    def test_private_paths_and_source_extensions(self):
        for name in ['../key.txt','/key.txt','.local/notes.txt','content/issues/issue-007.json','ops/run.txt','index.html.map','C:/key.txt','x\\key.txt']:
            with self.subTest(name=name),self.assertRaises(ValueError):
                bundle.check_name(name)

    def test_public_files(self):
        for name in ['index.html','_next/static/chunks/app.js','issues/issue-007/brief.md','images/issues/cover.jpg','.nojekyll']:
            bundle.check_name(name)

    def test_private_markers(self):
        with self.assertRaises(ValueError):
            bundle.check_text('index.html',b'C:/Users/person/private')

    def test_missing_page_and_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            archive=Path(temp)/'site.tar.gz'
            with tarfile.open(archive,'w:gz') as tar:
                item=tarfile.TarInfo('index.html'); item.size=2
                tar.addfile(item,io.BytesIO(b'ok'))
            with self.assertRaises(ValueError):
                bundle.validate(archive,'issue-007')
            with tarfile.open(archive,'w:gz') as tar:
                item=tarfile.TarInfo('index.html'); item.type=tarfile.SYMTYPE; item.linkname='../secret'
                tar.addfile(item)
            with self.assertRaises(ValueError):
                bundle.validate(archive,'issue-007')

if __name__=='__main__':
    unittest.main()
