#!/bin/sh
echo "------------------------------------------"
echo "-- Installing CUDA Toolkit and CUDA DNN --"
echo "------------------------------------------"
# Install CUDA Drivers and Toolkit
if [ -x "$(command -v apt)" ]; then
    wget https://cdn.shinobi.video/installers/cuda-repo-ubuntu1804-10-0-local-10.0.130-410.48_1.0-1_amd64.deb -O cuda.deb
    dpkg -i cuda.deb
    sudo apt-key add /var/cuda-repo-10-0-local-10.0.130-410.48/7fa2af80.pub
    sudo apt-get update
    sudo apt install cuda-toolkit-10-0
    sudo apt-get update -y

    sudo apt-get -o Dpkg::Options::="--force-overwrite" install cuda-toolkit-10-0 -y --no-install-recommends
    sudo apt-get -o Dpkg::Options::="--force-overwrite" install --fix-broken -y
    sudo apt install nvidia-utils-440 nvidia-headless-440 -y

    # Install CUDA DNN
    wget https://cdn.shinobi.video/installers/libcudnn7_7.6.5.32-1+cuda10.0_amd64.deb -O cuda-dnn.deb
    sudo dpkg -i cuda-dnn.deb
    wget https://cdn.shinobi.video/installers/libcudnn7-dev_7.6.5.32-1+cuda10.0_amd64.deb -O cuda-dnn-dev.deb
    sudo dpkg -i cuda-dnn-dev.deb
    echo "-- Cleaning Up --"
    # Cleanup
    sudo rm cuda-dnn.deb
    sudo rm cuda-dnn-dev.deb
fi
if [ -x "$(command -v yum)" ]; then
    wget https://developer.download.nvidia.com/compute/cuda/repos/rhel7/x86_64/cuda-repo-rhel7-10.0.130-1.x86_64.rpm
    sudo rpm -i cuda-repo-rhel7-10.0.130-1.x86_64.rpm
    sudo yum clean all
    sudo yum install cuda-toolkit-10-0 -y
    wget https://cdn.shinobi.video/installers/libcudnn7-7.6.5.32-1.cuda10.0.x86_64.rpm -O cuda-dnn.rpm
    sudo yum -y localinstall cuda-dnn.rpm
    wget https://cdn.shinobi.video/installers/libcudnn7-devel-7.6.5.32-1.cuda10.0.x86_64.rpm -O cuda-dnn-dev.rpm
    sudo yum -y localinstall cuda-dnn-dev.rpm
    echo "-- Cleaning Up --"
    sudo rm cuda-dnn.rpm
    sudo rm cuda-dnn-dev.rpm
fi

echo "------------------------------"
echo "Reboot is required. Do it now?"
echo "------------------------------"
echo "(y)es or (N)o. Default is No."
read rebootTheMachineHomie
if [ "$rebootTheMachineHomie" = "y" ] || [ "$rebootTheMachineHomie" = "Y" ]; then
    sudo reboot
fi
