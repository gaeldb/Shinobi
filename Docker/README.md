⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

# This Docker method is only for integrated Database and simple volume mounts. For separate database and more elaborate installation please use this registry instead :
https://gitlab.com/Shinobi-Systems/ShinobiDocker

⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐


# Install Shinobi with Docker

**Warning :** It is recommended that you have a dedicated machine for Shinobi even if you intend to use Docker. If you are willing to install directly on the operating system please consider installing Ubuntu 22.04 and using the Ninja Way.

We recommend that your Host OS is one of the following :

- Ubuntu 22.04
- CentOS 8
- MacOS 10.7

Docker Image Used : `registry.gitlab.com/shinobi-systems/shinobi:dev`

## Ninja Way - Docker Edition

> This method uses `docker-compose`. This will build your container from the images hosted on Gitlab. We no longer use Docker Hub and will not in the foreseeable future.

```
bash <(curl -s https://gitlab.com/Shinobi-Systems/Shinobi-Installer/raw/master/shinobi-docker.sh)
```

Once complete open port `8080` of your Docker host in a web browser.

## "Run" Way

**Installing Shinobi**

> Please remember to check out the Environment Variables table further down this README.

```
docker run -d --name='Shinobi' --memory=2g -p '8080:8080/tcp' -p '21:21/tcp' -v "$HOME/ShinobiDatabase":'/var/lib/mysql':'rw' -v "$HOME/Shinobi":'/home/Shinobi':'rw' registry.gitlab.com/shinobi-systems/shinobi:dev
```

## From Source
> Image is based on Ubuntu Bionic (20.04). Node.js 12 is used. MariaDB and FFmpeg are included.

1. Download Repo

```
git clone -b dev https://gitlab.com/Shinobi-Systems/Shinobi.git ShinobiSource
```

2. Enter repository.

```
cd ShinobiSource
```

3. Build Image.

```
docker build --tag shinobi-image:1.0 .
```

**Running on ARM32v7?** Run this instead.

```
docker build -f Dockerfile.arm32v7 --tag shinobi-image:1.0 .
```

4. Create a container with the image.

> This command only works on Linux because of the temporary directory used. This location must exist in RAM. `-v "/dev/shm/shinobiStreams":'/dev/shm/streams':'rw'`. The timezone is also acquired from the host by the volume declaration of `-v '/etc/localtime':'/etc/localtime':'ro'`.

```
docker run -d --name='Shinobi' --memory=2g -p '8080:8080/tcp' -p '21:21/tcp' -v "$HOME/ShinobiDatabase":'/var/lib/mysql':'rw' -v "$HOME/Shinobi":'/home/Shinobi':'rw' shinobi-image:1.0
```

 > Host mount paths have been updated in this document.


 ### Volumes

 | Volumes                      | Description                                                                                                                                         |
 |------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
 | $HOME/Shinobi | Maps to the `/home/Shinobi` folder for the `customAutoLoad`, `plugins`, and `videos` folders inside and other files. Additionally you can edit the conf.json and super.json here. |
 | $HOME/ShinobiDatabase       | A map to `/var/lib/mysql` in the container. This is the database's core files.                                                                      |

### Environment Variables

> Environment Variables have been disabled. You must now make changes in the conf.json itself when it is mounted on the host.
> If conf.json does not exist inside the mounted folder then you may create it and Shinobi will use that on next container start.

 > You must add (to the docker container) `/config/ssl/server.key` and `/config/ssl/server.cert`. The `/config` folder is mapped to `$HOME/Shinobi/config` on the host by default with the quick run methods. Place `key` and `cert` in `$HOME/Shinobi/config/ssl`. If `SSL_ENABLED=true` and these files don't exist they will be generated with `openssl`.

> For those using `DB_DISABLE_INCLUDED=true` please remember to create a user in your databse first. The Docker image will create the `DB_DATABASE` under the specified connection information.

### Power Video Viewer Blank or Not working

This seems to be an issue with using Docker on some linux OS' like Arch Linux. It is uncertain what the specific issue is but for now please use Docker on a consumer or enterprise supported distribution of linux, like Ubuntu 20.04.

### Tips

Modifying `conf.json` or Superuser credentials.
> Please read **Volumes** table in this README. conf.json is for general configuration. super.json is for Superuser credential management.

Get Docker Containers
```
docker ps -a
```

Get Images
```
docker images
```

Container Logs
```
docker logs /Shinobi
```

Enter the Command Line of the Container
```
docker exec -it /Shinobi /bin/bash
```

Stop and Remove
```
docker stop /Shinobi
docker rm /Shinobi
```

**WARNING - DEVELOPMENT ONLY!!!** Kill all Containers and Images
> These commands will completely erase all of your docker containers and images. **You have been warned!**

```
docker stop /Shinobi
docker rm $(docker ps -a -f status=exited -q)
docker rmi $(docker images -a -q)
```
