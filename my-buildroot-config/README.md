To use this config to build your own image, follow these steps:

1. Download a https://buildroot.org release. I tested this with the 2022.11.2 release.
2. Extract and change your path there.
3. Run `make BR2_EXTERNAL=path/to/my-buildroot-config v86_defconfig`.
4. Run `make`. You'll find the resulting images in `output/images`.
