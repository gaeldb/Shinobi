#!/bin/sh
which node > /dev/null

if [ "$?" -ne 0 ] ; then 
    echo "Installing NodeJS 18"
    mkdir -p /etc/apt/keyrings
    apt-get install -y ca-certificates gnupg
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    
    apt-get update -y --fix-missing 
    apt-get upgrade -y 
    apt-get install nodejs -y
fi 

node -v
npm -v

npm i npm@latest pm2 pg -g --save
npm install --unsafe-perm
