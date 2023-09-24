FROM node:18-bullseye-slim

ARG DEBIAN_FRONTEND=noninteractive \
    VAR_EXCLUDE_DB=false

ENV DB_USER=majesticflame \
    DB_PASSWORD='' \
    DB_HOST='localhost' \
    DB_DATABASE=ccio \
    DB_PORT=3306 \
    DB_TYPE='mysql' \
    SUBSCRIPTION_ID=sub_XXXXXXXXXXXX \
    PLUGIN_KEYS='{}' \
    SSL_ENABLED='false' \
    SSL_COUNTRY='CA' \
    SSL_STATE='BC' \
    SSL_LOCATION='Vancouver' \
    SSL_ORGANIZATION='Shinobi Systems' \
    SSL_ORGANIZATION_UNIT='IT Department' \
    SSL_COMMON_NAME='nvr.ninja' \
    DB_DISABLE_INCLUDED=$VAR_EXCLUDE_DB

WORKDIR /home/Shinobi
COPY . ./

RUN sh /home/Shinobi/Docker/install_dependencies.sh

VOLUME ["/home/Shinobi/videos"]
VOLUME ["/home/Shinobi/libs/customAutoLoad"]
VOLUME ["/config"]

EXPOSE 8080 443 21 25

ENTRYPOINT ["sh", "/home/Shinobi/Docker/init.sh"]

CMD [ "pm2-docker", "/home/Shinobi/Docker/pm2.yml" ]
