#!/bin/bash
DIR=$(dirname $0)
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "========================================================="
echo "To answer yes type the letter (y) in lowercase and press ENTER."
echo "Default is no (N). Skip any components you already have or don't need."
echo "============="
#Detect Ubuntu Version
echo "============="
echo " Detecting Ubuntu Version"
echo "============="
getubuntuversion=$(lsb_release -r | awk '{print $2}' | cut -d . -f1)
echo "============="
echo " Ubuntu Version: $getubuntuversion"
echo "============="
apt update -y
apt update --fix-missing -y
if [ "$getubuntuversion" = "18" ] || [ "$getubuntuversion" -le "18" ]; then
    apt install sudo wget -y
    sudo apt install -y software-properties-common
    sudo add-apt-repository universe -y
    apt update -y
    apt update --fix-missing -y
fi
if [ "$getubuntuversion" = "16" ]; then
    sudo apt install gnupg-curl -y
fi
sudo apt install gcc g++ cmake -y
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 800 --slave /usr/bin/g++ g++ /usr/bin/g++-8
#create conf.json
if [ ! -e "./conf.json" ]; then
    sudo cp conf.sample.json conf.json
    #Generate a random Cron key for the config file
    cronKey=$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')
    #Insert key into conf.json
    sudo sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
fi
#create super.json
if [ ! -e "./super.json" ]; then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
    sudo cp super.sample.json super.json
fi
if ! [ -x "$(command -v ifconfig)" ]; then
    echo "============="
    echo "Shinobi - Installing Net-Tools"
    sudo apt install net-tools -y
fi
if ! [ -x "$(command -v node)" ]; then
    echo "============="
    echo "Shinobi - Installing Node.js"
    sh $DIR/nodejs-ubuntu.sh
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    sudo apt install npm -y
fi
sudo apt install make zip -y
if ! [ -x "$(command -v ffmpeg)" ]; then
    if [ "$getubuntuversion" = "16" ] || [ "$getubuntuversion" -le "16" ]; then
        echo "============="
        echo "Shinobi - Get FFMPEG 3.x from ppa:jonathonf/ffmpeg-3"
        sudo add-apt-repository ppa:jonathonf/ffmpeg-3 -y
        sudo apt update -y && sudo apt install ffmpeg x264 x265 -y
    else
        echo "============="
        echo "Shinobi - Installing FFMPEG"
        sudo apt install ffmpeg -y
    fi
else
    echo "FFmpeg Found..."
    echo "Version : $(ffmpeg -version)"
fi
echo "============="
echo "Shinobi - Installing MariaDB"
echo "MariaDB will be installed with no password."
sqlpass=""
echo "mariadb-server mariadb-server/root_password password $sqlpass" | debconf-set-selections
echo "mariadb-server mariadb-server/root_password_again password $sqlpass" | debconf-set-selections
sudo apt install mariadb-server -y
sudo service mysql start
echo "============="
echo "Shinobi - Installing Database..."
sqluser="root"
sudo mysql -e "source sql/user.sql" || true
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm i npm -g
sudo npm install --unsafe-perm
# sudo npm audit fix --force
echo "============="
echo "Shinobi - Install PM2"
sudo npm install pm2@latest -g
echo "Shinobi - Finished"
sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix /home/Shinobi/INSTALL/shinobi
ln -s /home/Shinobi/INSTALL/shinobi /usr/bin/shinobi
echo "Shinobi - Randomizing cron key"
node /home/Shinobi/tools/modifyConfiguration.js addToConfig="{\"cron\":{\"key\":\"$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')\"}}"
echo "Shinobi - Starting Shinobi and setting to start on boot"
sudo pm2 start camera.js
#sudo pm2 start cron.js
sudo pm2 startup
sudo pm2 save
sudo pm2 list
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user!!"
echo "||==================================="
echo "|| Open http://$(ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p'):8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "====================================="
echo "====================================="
