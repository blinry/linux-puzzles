echo "
# Auto-login as root on ttyS0
::respawn:/sbin/getty ttyS0 38400 xterm -n -l /bin/sh" >> "$TARGET_DIR"/etc/inittab
