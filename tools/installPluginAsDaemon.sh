#!/bin/bash
DIR=$(dirname $0)
PLUGIN_DIR="$DIR/../plugins/$1"
SPECIFIED_KEY="$3"
if [ -d "$PLUGIN_DIR" ]; then
    INSTALLER_SCRIPT="$PLUGIN_DIR/INSTALL.sh"
    if [ "$SPECIFIED_KEY" == "" ]; then
        echo "Generating Random Plugin Key"
        SPECIFIED_KEY=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')
    else
        echo "Using specified Plugin Key"
    fi
    sudo node $DIR/modifyConfigurationForPlugin.js $1 key=
    if [ "$2" == "true" ]; then
        cd $INSTALLER_SCRIPT
        if [ -f "$INSTALLER_SCRIPT" ]; then
            sudo sh $INSTALLER_SCRIPT
        else
            sudo npm install
        fi
    fi
else
    echo "Plugin not found : $PLUGIN_DIR"
fi
