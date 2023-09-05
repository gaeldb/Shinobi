#!/bin/bash
DIR=$(dirname $0)
echo "Shinobi - Do you want to Install Node.js?"
echo "(y)es or (N)o"
read -r nodejsinstall
if [ "$nodejsinstall" = "y" ]; then
    sh $DIR/nodejs-ubuntu.sh
fi

#Detect Ubuntu Version
echo "============="
echo " Detecting Ubuntu Version"
echo "============="
getubuntuversion=$(lsb_release -r | awk '{print $2}' | cut -d . -f1)
echo "============="
echo " Ubuntu Version: $getubuntuversion"
echo "============="
if [[ "$getubuntuversion" == "16" || "$getubuntuversion" -le "16" ]]; then
    echo "============="
    echo "Shinobi - Get FFMPEG 3.x from ppa:jonathonf/ffmpeg-3"
    sudo add-apt-repository ppa:jonathonf/ffmpeg-3 -y
    sudo apt update -y && sudo apt install ffmpeg x264 x265 -y
    echo "============="
else
    echo "============="
    echo "Shinobi - Installing FFMPEG"
    sudo apt install ffmpeg x264 x265 -y
    echo "============="
fi

# Install MariaDB
echo "Shinobi - Do you want to Install MariaDB? Choose No if you have MySQL."
echo "(y)es or (N)o"
read -r mysqlagree
if [ "$mysqlagree" = "y" ]; then
    echo "Shinobi - Installing MariaDB"
    echo "Password for root SQL user, If you are installing SQL now then you may put anything:"
    read -r sqlpass
    echo "mariadb-server mariadb-server/root_password password $sqlpass" | debconf-set-selections
    echo "mariadb-server mariadb-server/root_password_again password $sqlpass" | debconf-set-selections
    apt install mariadb-server -y
    service mysql start
fi

# Make sure files have correct perms
chmod -R 755 .

# Database Installation
#Check If Mysql-Server is already installed

echo "============="
echo "Checking for mysql-server"
echo "============="
dpkg -s mysql-server &> /dev/null
if [ $? -eq 0 ]; then
    echo "+====================================+"
    echo "| Warning MYSQL SERVER IS INSTALLED! |"
    echo "+====================================+"
    echo "|  DO YOU WANT TO INSTALL MariaDB?   |"
    echo "|  This will remove MYSQL-Server!    |"
    echo "+====================================+"
    echo "Shinobi - Do you want to Install MariaDB?"
    echo "(y)es or (N)o"
    read -r installmariadb
    if [ "$installmariadb" = "y" ]; then
        echo "+=============================================+"
        echo "| This will DESTORY ALL DATA ON MYSQL SERVER! |"
        echo "+=============================================+"
        echo "Please type the following to continue"
        echo "DESTORY!"
        read -r mysqlagree
        if [ "$mysqlagree" = "DESTORY!" ]; then
            echo "Shinobi - Installing MariaDB"
            echo "Password for root SQL user, If you are installing SQL now then you may put anything:"
            read -r sqlpass
            echo "mariadb-server mariadb-server/root_password password $sqlpass" | debconf-set-selections
            echo "mariadb-server mariadb-server/root_password_again password $sqlpass" | debconf-set-selections
            #Create my.cnf file
            echo "[client]" >> ~/.my.cnf
            echo "user=root" >> ~/.my.cnf
            echo "password=$sqlpass" >> ~/.my.cnf
            chmod 755 ~/.my.cnf
            apt install mariadb-server
            service mysql start
        fi
    fi
else
    echo "Shinobi - Do you want to Install MariaDB?"
    echo "(y)es or (N)o"
    read -r mysqlagree
    if [ "$mysqlagree" = "y" ]; then
        echo "Shinobi - Installing MariaDB"
        echo "Password for root SQL user, If you are installing SQL now then you may put anything:"
        read -r sqlpass
        echo "mariadb-server mariadb-server/root_password password $sqlpass" | debconf-set-selections
        echo "mariadb-server mariadb-server/root_password_again password $sqlpass" | debconf-set-selections
        echo "[client]" >> ~/.my.cnf
        echo "user=root" >> ~/.my.cnf
        echo "password=$sqlpass" >> ~/.my.cnf
        chmod 755 ~/.my.cnf
        apt install mariadb-server -y
        service mysql start
    fi
fi

chmod -R 755 .
echo "Shinobi - Database Installation"
echo "(y)es or (N)o"
read -r mysqlagreeData
if [ "$mysqlagreeData" = "y" ]; then
    mysql -e "source sql/user.sql" || true
    echo "Shinobi - Do you want to Install Default Data (default_data.sql)?"
    echo "(y)es or (N)o"
    read -r mysqlDefaultData
    if [ "$mysqlDefaultData" = "y" ]; then
        escapeReplaceQuote='\\"'
        groupKey=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,7)}')
        userID=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,6)}')
        userEmail=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,6)}')"@"$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,6)}')".com"
        userPasswordPlain=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,7)}')
        userPasswordMD5=$(echo -n "$userPasswordPlain" | md5sum | awk '{print $1}')
        userDetails='{"days":"10"}'
        userDetails=$(echo "$userDetails" | sed -e 's/"/'$escapeReplaceQuote'/g')
        echo "$userDetailsNew"
        apiIP='0.0.0.0'
        apiKey=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,32)}')
        apiDetails='{"auth_socket":"1","get_monitors":"1","control_monitors":"1","get_logs":"1","watch_stream":"1","watch_snapshot":"1","watch_videos":"1","delete_videos":"1"}'
        apiDetails=$(echo "$apiDetails" | sed -e 's/"/'$escapeReplaceQuote'/g')
        rm sql/default_user.sql || true
        echo "USE ccio;INSERT INTO Users (\`ke\`,\`uid\`,\`auth\`,\`mail\`,\`pass\`,\`details\`) VALUES (\"$groupKey\",\"$userID\",\"$apiKey\",\"$userEmail\",\"$userPasswordMD5\",\"$userDetails\");INSERT INTO API (\`code\`,\`ke\`,\`uid\`,\`ip\`,\`details\`) VALUES (\"$apiKey\",\"$groupKey\",\"$userID\",\"$apiIP\",\"$apiDetails\");" > "sql/default_user.sql"
        mysql -u "$sqluser" -p"$sqlpass" --database ccio -e "source sql/default_user.sql" > "INSTALL/log.txt"
        echo "====================================="
        echo "=======!! Login Credentials !!======="
        echo "|| Username : $userEmail"
        echo "|| Password : $userPasswordPlain"
        echo "|| API Key : $apiKey"
        echo "====================================="
        echo "====================================="
        echo "** To change these settings login to either to the Superuser panel or login to the dashboard as the user that was just created and open the Settings window. **"
    fi
fi

# Install NPM Libraries
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm i npm -g
sudo npm install --unsafe-perm
# sudo npm audit fix --unsafe-perm
echo "============="

#Install PM2
echo "Shinobi - Install PM2"
sudo npm install pm2@latest -g
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
fi
if [ ! -e "./super.json" ]; then
    getip=$(ip route get 8.8.8.8 | awk '{print $NF; exit}')
    echo "Admin panel default url: http://$getip:8080/super"
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    cp super.sample.json super.json
fi
echo "Shinobi - Finished"
touch INSTALL/installed.txt
echo "Shinobi - Start Shinobi?"
echo "(y)es or (N)o"
read -r startShinobi
if [ "$startShinobi" = "y" ]; then
    pm2 start camera.js
    #pm2 start cron.js
    pm2 list
fi
