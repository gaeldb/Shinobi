#!/bin/bash
echo "Shinobi Installer"
echo "========"
echo "Select your OS"
echo "If your OS is not on the list please refer to the docs."
echo "========"
echo "1. Ubuntu - Fast and Touchless"
echo "2. Ubuntu - Advanced"
echo "3. Alma Linux 9.2 / Rocky 9 / CentOS 8 - Fast and Touchless (Red Hat)"
echo "4. CentOS"
echo "5. MacOS"
echo "6. FreeBSD"
echo "7. OpenSUSE"
echo "========"
read oschoicee
case $oschoicee in
"1")
chmod +x INSTALL/ubuntu-touchless.sh
sh INSTALL/ubuntu-touchless.sh
  ;;
"2")
chmod +x INSTALL/ubuntu.sh
sh INSTALL/ubuntu.sh
  ;;
"3")
chmod +x INSTALL/rocky9-touchless.sh
sh INSTALL/rocky9-touchless.sh
  ;;
"4")
chmod +x "INSTALL/CentOS - Quick Install.sh"
sh "INSTALL/CentOS - Quick Install.sh" 1
  ;;
"5")
chmod +x INSTALL/macos.sh
sh INSTALL/macos.sh
  ;;
"6")
chmod +x INSTALL/freebsd.sh
sh INSTALL/freebsd.sh
  ;;
"7")
chmod +x INSTALL/opensuse.sh
sh INSTALL/opensuse.sh
  ;;

*)
  echo "Choice not found."
  ;;
esac
