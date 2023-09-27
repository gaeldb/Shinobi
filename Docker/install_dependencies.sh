#!/bin/sh
mkdir -p /etc/apt/keyrings

apt update -y --fix-missing
apt upgrade -y
apt update -y --fix-missing

apt install -y \
        wget \
        curl \
        net-tools \
        software-properties-common \
        libfreetype6-dev \
        libgnutls28-dev \
        libmp3lame-dev \
        libass-dev \
        libogg-dev \
        libtheora-dev \
        libvorbis-dev \
        libvpx-dev \
        libwebp-dev \
        libssh2-1-dev \
        libopus-dev \
        librtmp-dev \
        libx264-dev \
        libx265-dev \
        yasm \
        build-essential \
        bzip2 \
        coreutils \
        procps \
        gnutls-bin \
        nasm \
        tar \
        x264 \
        ffmpeg \
        git \
        make \
        g++ \
        gcc \
        pkg-config \
        python3 \
        tar \
        sudo \
        xz-utils \
        ca-certificates \
        gnupg \
        apt-utils

if [ "$INSTALL_NODE" = "true" ] ; then set -ex; \
	curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg ; \
	echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list ; \
	apt update -y --fix-missing ; \
	apt upgrade -y ; \
	apt install nodejs -y ; fi 

node -v
npm -v

npm i npm@latest pm2 pg -g  --save
npm install --unsafe-perm 

chmod 777 /home/Shinobi
chmod -R 777 /home/Shinobi/plugins
chmod -f +x /home/Shinobi/Docker/init.sh

sed -i -e 's/\r//g' /home/Shinobi/Docker/init.sh

ffmpeg -version

# Install MariaDB server... the debian way
if [ "$DB_DISABLE_INCLUDED" = "false" ] ; then set -ex; \
	{ \
		echo "mariadb-server" mysql-server/root_password password '${DB_ROOT_PASSWORD}'; \
		echo "mariadb-server" mysql-server/root_password_again password '${DB_ROOT_PASSWORD}'; \
	} | debconf-set-selections; \
        mkdir -p /var/lib/mysql; \
        apt-get update; \
	apt-get install -y \
		"mariadb-server" \
        socat \
	; \
        find /etc/mysql/ -name '*.cnf' -print0 \
		| xargs -0 grep -lZE '^(bind-address|log)' \
		| xargs -rt -0 sed -Ei 's/^(bind-address|log)/#&/'; \
        sed -ie "s/^bind-address\s*=\s*127\.0\.0\.1$/#bind-address = 0.0.0.0/" /etc/mysql/my.cnf; fi
