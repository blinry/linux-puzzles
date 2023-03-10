# Prototype for Linux tutorials in the browser

## How to run

Start a local webserver. I like `live-server` or `python -m http.server`.

## How to build the included files yourself

### lib/v86.wasm and lib/libv86.js

Download https://github.com/copy/v86 and run `make all`. The resulting files are `build/v86.wasm` and `build/liv86.js`.

### images/seabios.bin and images/vgabios.bin

From https://github.com/copy/v86/tree/master/bios.

### images/image.iso

1. Download a https://buildroot.org release. I tested this with the 2022.11.2 release.
2. Extract and change your path there.
3. Run `make BR2_EXTERNAL=path/to/my-buildroot-config v86_defconfig`.
4. Run `make`. You'll find the result in `output/images/rootfs.iso9660`.

### images/booted-state.bin.zst

1. Set `restoreState = false` in *script.js*.
2. Boot the VM, log in as root, maybe clear the screen.
3. Save the state to a file using the button under the terminal.
4. Run `zstd -19` on the resulting file, and copy it to *images/booted-state.bin.zst*.

## Attribution

- https://github.com/copy/v86 (BSD-2-Clause)
- https://www.seabios.org (LGPLv3)
- https://buildroot.org (GPLv2+)

## License

All files in the root directory of this project and in *my-buildroot-config* are released under the [Blue Oak Model License 1.0.0](LICENSE.md) – a [modern alternative](https://writing.kemitchell.com/2019/03/09/Deprecation-Notice.html) to the MIT license. It's a a pleasant read! :)
