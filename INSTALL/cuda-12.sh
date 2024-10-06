#!/bin/sh
echo "------------------------------------------"
echo "-- Installing CUDA Toolkit and CUDA DNN --"
echo "------------------------------------------"
# Install CUDA Drivers and Toolkit
echo "Install CUDA Drivers and Toolkit?"
echo "(y)es or (N)o"
read installTheStuffHomie
if [ "$installTheStuffHomie" = "y" ] || [ "$installTheStuffHomie" = "Y" ]; then
    if [ -x "$(command -v apt)" ]; then
        # CUDA Toolkit
        wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin
        sudo mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600
        echo "Downloading CUDA Toolkit..."
        wget https://developer.download.nvidia.com/compute/cuda/12.0.0/local_installers/cuda-repo-ubuntu2204-12-0-local_12.0.0-525.60.13-1_amd64.deb
        sudo dpkg -i cuda-repo-ubuntu2204-12-0-local_12.0.0-525.60.13-1_amd64.deb
        sudo cp /var/cuda-repo-ubuntu2204-12-0-local/cuda-*-keyring.gpg /usr/share/keyrings/
        sudo apt-get update
        sudo apt-get -y install cuda-toolkit-12-0

        # Driver
        echo "Installing nvidia-driver-515-server"
        sudo apt install nvidia-driver-515-server -y

        # Install CUDA DNN
        wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/libcudnn8_8.8.1.3-1+cuda12.0_amd64.deb -O cuda-dnn.deb --no-verbose
        sudo dpkg -i cuda-dnn.deb
        wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/libcudnn8-dev_8.8.1.3-1+cuda12.0_amd64.deb -O cuda-dnn-dev.deb --no-verbose
        sudo dpkg -i cuda-dnn-dev.deb
        echo "-- Cleaning Up --"
        # Cleanup
        sudo rm cuda.deb
        sudo rm cuda-dnn.deb
        sudo rm cuda-dnn-dev.deb
    fi
    echo "------------------------------"
    echo "Reboot is required. Do it now?"
    echo "------------------------------"
    echo "(y)es or (N)o. Default is No."
    read rebootTheMachineHomie
    if [ "$rebootTheMachineHomie" = "y" ] || [ "$rebootTheMachineHomie" = "Y" ]; then
        sudo reboot
    fi
fi
