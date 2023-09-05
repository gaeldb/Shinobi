#!/bin/bash

#Identify version of CentOS
version=$(rpm --eval %{centos_ver})
DIR=$(dirname $0)

#Set script to use dnf or yum
if [ "$version" = 7 ]; then
	pkgmgr="yum"
elif [ "$version" = 8 ]; then
	pkgmgr="dnf"
else
	echo "This version of CentOS is unsupported!"
	read -p "Continue at your own risk? Y/N" osoverride

	if [ ! "${osoverride^}" = "Y" ]; then
		exit 1
	else
		pkgmgr="yum"
	fi
fi

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
echo "This script will install Shinobi CCTV on CentOS $version with"
echo "minimal user intervention."
echo
echo "You may skip any components you already have or do not"
echo "wish to install."
echo "========================================================="
read -p "Press [Enter] to begin..."

#Install dependencies
echo "Installing dependencies and tools..."

if [ "$version" = 7 ]; then
	#Installing deltarpm first will greatly increase the download speed of the other packages
	sudo yum install deltarpm -y -q -e 0
fi

#Install remaining packages
sudo "$pkgmgr" install "$vm" nano dos2unix net-tools curl wget git gcc gcc-c++ make cmake zip -y -q -e 0

#Install updates
echo "Updating system..."
sudo "$pkgmgr" update -y -q -e 0

#Skip if running from the Ninja installer
if [ "$1" != 1 ]; then
	#Clone git repo and change directory
	if sudo git clone -q https://gitlab.com/Shinobi-Systems/Shinobi.git Shinobi &> /dev/null; then
		echo "Successfully cloned Shinobi repository."
	else
		echo "Failed to clone Shinobi repository!"
	fi
	if cd Shinobi; then
		echo "Changed to the Shinobi Directory."
	else
		echo "Failed to change to the Shinobi directory!";
		exit 1
	fi

	echo "========================================================="
	read -p "Do you want to use the Development branch of Shinobi? Y/N " gitbranch

	if [ "${gitbranch^}" = "Y" ]; then
		#Change to dev branch
		sudo git checkout dev
		sudo git pull
	fi
fi

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
	sudo "$pkgmgr" install npm -y -q -e 0
else
	echo "NPM is already installed..."
    echo "Version: $(npm -v)"
fi

echo "========================================================="

#Check if FFMPEG is installed
if ! [ -x "$(command -v ffmpeg)" ]; then
	echo "FFMPEG not found, installing..."
	ffmpeginstall="Y"
else
	echo "FFMPEG is already installed and is version $(ffmpeg -version | sed -n "s/ffmpeg version \([-0-9.]*\).*/\1/p;")."
	read -p "Do you want to install FFMPEG? Y/N " ffmpeginstall
fi

if [ "${ffmpeginstall^}" = "Y" ]; then
    #Install EPEL Repo
    sudo "$pkgmgr" install epel-release -y -q -e 0
    if [ "$version" = 7 ]; then
		#Enable Nux Dextop repo for FFMPEG (CentOS 7)
		sudo rpm --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro
		sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-1.el7.nux.noarch.rpm
		sudo yum install ffmpeg ffmpeg-devel -y -q -e 0
	elif [ "$version" = 8 ]; then
		#Enable Negativo17 repo for FFMPEG (CentOS 8)
		sudo dnf install epel-release dnf-utils -y -q -e 0
		sudo yum-config-manager --set-enabled powertools
		sudo yum-config-manager --add-repo=https://negativo17.org/repos/epel-multimedia.repo
		sudo dnf install ffmpeg ffmpeg-devel -y -q -e 0
	fi
fi

echo "========================================================="
read -p "Do you want to install MariaDB? Y/N " installdbserver

if [ "${installdbserver^}" = "Y" ] || [ "${installdbserver^}" = "" ]; then
    echo "Installing MariaDB repository..."
	#Add the MariaDB repository to yum
	sudo curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --skip-maxscale
	echo "Installing MariaDB..."
    sudo "$pkgmgr" install mariadb mariadb-server -y -q -e 0
    #Start mysql and enable on boot
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
	echo "========================================================="
	read -p "Do you want to configure basic security for MariaDB? Y/N " securedbserver

	if [ "${securedbserver^}" = "Y" ]; then
		#Configure basic security for MariaDB
		sudo mariadb-secure-installation
	else
		echo "========================================================="
		echo "Skipping database server security configuration..."
	fi
else
    echo "Skipping database server installation..."
fi

echo "========================================================="
read -p "Install default database? Y/N " mysqlDefaultData

if [ "${mysqlDefaultData^}" = "Y" ]; then

	echo "========================================================="
	#Get the username and password we will use to connect to the database
	read -p "Please enter your MariaDB username: " sqluser
	read -sp "Please enter your MariaDB password: " sqlpass

	if [ "${installdbserver^}" = "N" ]; then
		echo ""
		#Get the hostname/ip of the database server
		echo "Please enter the hostname or IP address of the database"
		read -p "server, or leave blank for localhost: " sqlhost
		#Get the port for the database server
		while :; do
			echo "Please enter the port number of the MariaDB instance,"
			read -p "or leave blank for the default port: " sqlport
			[[ "$sqlport" =~ ^[0-9]+$|^$ ]] || { echo "Please enter numeric characters only"; echo ""; continue; }
			if [ "$sqlport" = "" ]; then
					sqlport=3306
					break
			elif [ "$sqlport" -ge 1 ] && [ "$sqlport" -le 65535 ]; then
				break
			else
                echo "Please enter a number between 1 and 65535"
                echo "or leave blank for the default port 3306"
                echo ""
			fi
		done

		#If the hostname is left blank, use localhost
		if [ "$sqlhost" = "" ]; then
			sqlhost=127.0.0.1
		fi

		#Loop until able to connect to the database
		while ! mysql -h "$sqlhost" -P "$sqlport" -u "$sqluser" -p"$sqlpass" -e ";" ; do
			echo "Unable to connect to MariaDB with the supplied credentials!"
			read -p "Please enter your MariaDB username: " sqluser
			read -sp "Please enter your MariaDB password: " sqlpass
			echo ""
			echo "Please enter the hostname or IP address of the database"
			read -p "server, or leave blank for localhost: " sqlhost

			while :; do
				echo "Please enter the port number of the MariaDB instance,"
				read -p "or leave blank for the default port: " sqlport
				[[ "$sqlport" =~ ^[0-9]+$|^$ ]] || { echo "Please enter numeric characters only"; echo ""; continue; }
				if [ "$sqlport" = "" ]; then
						sqlport=3306
						break
				elif [ "$sqlport" -ge 1 ] && [ "$sqlport" -le 65535 ]; then
					break
				else
					echo "Please enter a number between 1 and 65535"
					echo "or leave blank for the default port 3306"
					echo ""
				fi
			done

			#If the hostname is left blank, use localhost
			if [ "$sqlhost" = "" ]; then
				sqlhost=127.0.0.1
			fi
		done
	else
		while ! mysql -u "$sqluser" -p"$sqlpass" -e ";" ; do
			echo "Unable to connect to MariaDB with the supplied credentials!"
			read -p "Please enter your MariaDB username: " sqluser
			read -sp "Please enter your MariaDB password: " sqlpass
			echo ""
			sqlhost=127.0.0.1
			sqlport=3306
		done
	fi
	echo ""
	echo "========================================================="
	echo "Inserting database tables"
	#Connect to the database and insert the default database
    sudo mysql -h "$sqlhost" -P "$sqlport" -u "$sqluser" -p"$sqlpass" -e "source sql/user.sql" || true
else
	echo "========================================================="
    echo "Skipping database installation..."
fi

echo "========================================================="
echo "Installing NPM libraries..."
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm install ffbinaries mp4frag@latest cws@latest
# sudo npm audit fix --force

echo "========================================================="
echo "Installing PM2..."
sudo npm install pm2@latest -g

sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix INSTALL/shinobi
ln -s INSTALL/shinobi /usr/bin/shinobi

echo "========================================================="
read -p "Automatically create firewall rules? Y/N " createfirewallrules

if [ "${createfirewallrules^}" = "Y" ]; then
    sudo firewall-cmd --permanent --add-port=8080/tcp -q
    sudo firewall-cmd --reload -q
fi

#Create default configuration file
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
	echo "Created conf.json"

    #Generate a random Cron key for the config file
    cronKey=$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')
	#Insert key into conf.json
    sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
	echo "Cron key generated"
fi

if [ ! -e "./super.json" ]; then
    echo "========================================================="
    echo "Enable superuser access?"
    echo "This may be useful for account and password managment"
    read -p "in commercial deployments. Y/N " createSuperJson

    if [ "${createSuperJson^}" = "Y" ]; then
        sudo cp super.sample.json super.json
    fi
fi

echo "========================================================="
read -p "Start Shinobi on boot? Y/N " startupShinobi

if [ "${startupShinobi^}" = "Y" ]; then
    sudo pm2 startup
    sudo pm2 save
    sudo pm2 list
fi

echo "========================================================="
read -p "Start Shinobi now? Y/N " startShinobi

if [ "${startShinobi^}" = "Y" ]; then
    sudo pm2 start camera.js
    #sudo pm2 start cron.js
fi

ipaddress=$(hostname -I)

echo ""
echo "========================================================="
echo "||=============== Installation Complete ===============||"
echo "========================================================="
echo "|| Login with the Superuser and create a new user!!    ||"
echo "========================================================="
echo "|| Open http://${ipaddress// /}:8080/super in your browser. ||"
echo "========================================================="
if [ "${createSuperJson^}" = "Y" ]; then
    echo "|| Default Superuser : admin@shinobi.video             ||"
    echo "|| Default Password : admin                            ||"
	echo "|| You can edit these settings in \"super.json\"         ||"
	echo "|| located in the Shinobi directory.                   ||"
    echo "========================================================="
fi
