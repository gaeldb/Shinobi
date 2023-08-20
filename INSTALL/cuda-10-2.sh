#!/bin/sh
echo "------------------------------------------"
echo "-- Installing CUDA Toolkit and CUDA DNN --"
echo "------------------------------------------"
# Install CUDA Drivers and Toolkit
if [ -x "$(command -v apt)" ]; then
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/cuda-ubuntu1804.pin
    sudo mv cuda-ubuntu1804.pin /etc/apt/preferences.d/cuda-repository-pin-600
    sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/7fa2af80.pub
    sudo add-apt-repository "deb http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/ /"
    sudo apt-get update

    sudo apt-get update -y

    sudo apt-get -o Dpkg::Options::="--force-overwrite" install  cuda-toolkit-10-2 -y --no-install-recommends
    sudo apt-get -o Dpkg::Options::="--force-overwrite" install --fix-broken -y
    sudo apt install nvidia-utils-440 nvidia-headless-440 -y

    # Install CUDA DNN
    wget https://cdn.shinobi.video/installers/libcudnn7_7.6.5.32-1+cuda10.2_amd64.deb -O cuda-dnn.deb
    sudo dpkg -i cuda-dnn.deb
    wget https://cdn.shinobi.video/installers/libcudnn7-dev_7.6.5.32-1+cuda10.2_amd64.deb -O cuda-dnn-dev.deb
    sudo dpkg -i cuda-dnn-dev.deb
    echo "-- Cleaning Up --"
    # Cleanup
    sudo rm cuda-dnn.deb
    sudo rm cuda-dnn-dev.deb
fi
if [ -x "$(command -v yum)" ]; then
    sudo yum-config-manager --add-repo http://developer.download.nvidia.com/compute/cuda/repos/rhel7/x86_64/cuda-rhel7.repo
    sudo yum clean all
    sudo yum -y install nvidia-driver-latest-dkms cuda-toolkit-10-2
    sudo yum -y install cuda-drivers
    wget https://cdn.shinobi.video/installers/libcudnn7-7.6.5.33-1.cuda10.2.x86_64.rpm -O cuda-dnn.rpm
    sudo yum -y localinstall cuda-dnn.rpm
    wget https://cdn.shinobi.video/installers/libcudnn7-devel-7.6.5.33-1.cuda10.2.x86_64.rpm -O cuda-dnn-dev.rpm
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
