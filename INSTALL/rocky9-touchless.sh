#!/bin/bash
DIR=$(dirname $0)
if ! [ -x "$(command -v dnf)" ]; then
	echo 'This installer does not run on systems without "dnf" package manager. Try "CentOS - Quick Install"'
	exit 1
fi
#Identify version of CentOS
version=$(rpm --eval %{centos_ver})


#Check to see if we are running on a virtual machine
if hostnamectl | grep -oq "Chassis: vm"; then
    vm="open-vm-tools"
else
    vm=""
fi

#Clear screen
clear

echo "========================================================="
echo "==   Shinobi : The Open Source CCTV and NVR Solution   =="
echo "========================================================="
echo "This installer is for CentOS 8 and Rocky 9."
echo "https://shinobi.video for more information."
echo "========================================================="

#Install dependencies
echo "Installing dependencies and tools..."

if [ "$version" = 7 ]; then
	#Installing deltarpm first will greatly increase the download speed of the other packages
	sudo yum install deltarpm -y -q -e 0
fi

#Install remaining packages
sudo yum install "$vm" nano dos2unix net-tools curl wget git gcc gcc-c++ make cmake zip -y -q -e 0

#Install updates
echo "Updating system..."
sudo yum update -y -q -e 0

echo "========================================================="

#Check if Node.js is installed
if ! [ -x "$(command -v node)" ]; then
    echo "Node.js not found, installing..."
	sh $DIR/nodejs-redhat.sh
else
    echo "Node.js is already installed..."
    echo "Version: $(node -v)"
fi

echo "========================================================="

#Check if NPM is installed
if ! [ -x "$(command -v npm)" ]; then
	echo "NPM not found, installing..."
	sudo yum install npm -y -q -e 0
else
	echo "NPM is already installed..."
    echo "Version: $(npm -v)"
fi

echo "========================================================="

if ! [ -x "$(command -v mysql)" ]; then
    echo "Installing MariaDB repository..."
	#Add the MariaDB repository to yum
	sudo curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --skip-maxscale
	echo "Installing MariaDB..."
    sudo yum install mariadb mariadb-server -y -q -e 0
    #Start mysql and enable on boot
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
	ln -s /usr/bin/mariadb /usr/bin/mysql
fi

echo "========================================================="
sudo mysql -e "source sql/user.sql" || true

echo "========================================================="
echo "Installing NPM libraries..."
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm install ffbinaries
# sudo npm audit fix --force

echo "========================================================="
echo "Installing PM2..."
sudo npm install pm2@latest -g

sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix INSTALL/shinobi
chmod +x INSTALL/shinobi
ln -s INSTALL/shinobi /usr/bin/shinobi

echo "========================================================="
echo "Creating firewall rule for port 8080"
sudo firewall-cmd --permanent --add-port=8080/tcp -q
sudo firewall-cmd --reload -q
echo "Enabling Superuser"
sudo cp super.sample.json super.json
if [ ! -e "./conf.json" ]; then
	echo "Creating conf.json"
    cp conf.sample.json conf.json
fi

echo "========================================================="
sudo pm2 start camera.js
sudo pm2 startup
sudo pm2 save
sudo pm2 list
echo "========================================================="

ipaddress=$(hostname -I)

echo ""
echo "IP Address of this machine : ${ipaddress}"
echo ""
echo "========================================================="
echo "||=============== Installation Complete ===============||"
echo "========================================================="
echo "|| Login with the Superuser and create a new user!!    ||"
echo "========================================================="
echo "|| Open http://${ipaddress// /}:8080/super in your browser. ||"
echo "========================================================="
echo "|| Default Superuser : admin@shinobi.video             ||"
echo "|| Default Password : admin                            ||"
echo "|| You can edit these settings in \"super.json\"         ||"
echo "|| located in the Shinobi directory.                   ||"
echo "========================================================="
