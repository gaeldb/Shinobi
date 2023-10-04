#!/bin/sh
$EXCLUDE_DB > /dev/null

if [ "$?" -ne 0 ] ; then 
    echo "Installing MariaDB"
    set -ex
	{ \
		echo "mariadb-server" mysql-server/root_password password '${DB_ROOT_PASSWORD}'; \
		echo "mariadb-server" mysql-server/root_password_again password '${DB_ROOT_PASSWORD}'; \
	} | debconf-set-selections

    mkdir -p /var/lib/mysql
    apt-get update
	
    apt-get install -y mariadb-server socat
    
    find /etc/mysql/ -name '*.cnf' -print0 | xargs -0 grep -lZE '^(bind-address|log)' | xargs -rt -0 sed -Ei 's/^(bind-address|log)/#&/'
    sed -ie "s/^bind-address\s*=\s*127\.0\.0\.1$/#bind-address = 0.0.0.0/" /etc/mysql/my.cnf
fi