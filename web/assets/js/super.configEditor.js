$(document).ready(function () {
  var schema = {
    "title": lang["Main Configuration"],
    "type": "object",
    "properties": {
      "debugLog": {
        "title": lang["Enable Debug Log"],
        "type": "boolean",
        "default": false
      },
      "subscriptionId": {
        "title": lang["Fill in subscription ID"],
        "type": "string",
        "default": null
      },
      "port": {
        "title": lang["Server port"],
        "type": "integer",
        "default": 8080
      },
      "passwordType": {
        "title": lang["Password type"],
        "type": "string",
        "enum": [
          "sha256",
          "sha512",
          "md5"
        ],
        "default": "sha256"
      },
      "addStorage": {
        "type": "array",
        "format": "table",
        "title": lang["Additional Storage"],
        "description": lang["AdditionalStorageDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": lang["Storage Array"],
          "properties": {
            "name": {
              "type": "string",
            },
            "path": {
              "type": "string",
              "default": "__DIR__/videos2"
            }
          }
        },
        "default": [
          {
            "name": "second",
            "path": "__DIR__/videos2"
          }
        ]
      },
      "plugins": {
        "type": "array",
        "format": "table",
        "title": lang["Plugins"],
        "descripton": lang["PluginsDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": lang["Plugin"],
          "properties": {
            "plug": {
              "title": lang["Plug"],
              "type": "string",
              "default": "pluginName"
            },
            "key": {
              "title": lang["Key"],
              "type": "string"
            },
            "mode": {
              "title": lang["Mode"],
              "type": "string",
              "enum": [
                "host",
                "client"
              ],
              "default": "client"
            },
            "https": {
              "title": lang["Https"],
              "type": "boolean",
              "descripton": "Only for Host mode.",
              "default": false
            },
            "host": {
              "title": lang["Host"],
              "type": "string",
              "descripton": "Only for Host mode.",
              "default": "localhost"
            },
            "port": {
              "title": lang["Port"],
              "type": "integer",
              "descripton": "Only for Host mode.",
              "default": 8082
            },
            "type": {
              "title": lang["Type"],
              "type": "string",
              "default": "detector"
            }
          }
        }
      },
      "pluginKeys": {
        "type": "object",
        "format": "table",
        "title": lang["Plugin Keys"],
        "description": lang["PluginKeysDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": "Plugin Key",
          "properties": {}
        }
      },
      "db": {
        "type": "object",
        "format": "table",
        "title": lang["Database Options"],
        "description": lang["DatabaseOptionDes"],
        "properties": {
          "host": {
            "title": lang["Hostname / IP"],
            "type": "string",
            "default": "127.0.0.1"
          },
          "user": {
            "title": lang["User"],
            "type": "string",
            "default": "majesticflame"
          },
          "password": {
            "title": lang["Password"],
            "type": "string",
            "default": ""
          },
          "database": {
            "title": lang["Database"],
            "type": "string",
            "default": "ccio"
          },
          "port": {
            "title": lang["Port"],
            "type": "integer",
            "default": 3306
          }
        },
        "default": {
          "host": "127.0.0.1",
          "user": "majesticflame",
          "password": "",
          "database": "ccio",
          "port": 3306
        }
      },
      "cron": {
        "type": "object",
        "format": "table",
        "title": lang["CRON Options"],
        "properties": {
          "key": {
            "type": "string",
          },
          "deleteOld": {
            "title": lang["deleteOld"],
            "type": "boolean",
            "description": lang["deleteOldDes"],
            "default": true
          },
          "deleteNoVideo": {
            "title": lang["deleteNoVideo"],
            "type": "boolean",
            "description": lang["deleteNoVideoDes"],
            "default": true
          },
          "deleteOverMax": {
            "title": lang["deleteOverMax"],
            "type": "boolean",
            "description": lang["deleteOverMaxDes"],
            "default": true
          },
        }
      },
      "mail": {
        "type": "object",
        "format": "table",
        "title": lang["Email Options"],
        "properties": {
          "service": {
            "title": lang["service"],
            "type": "string",
          },
          "host": {
            "title": lang["Host"],
            "type": "string",
          },
          "auth": {
            "title": lang["auth"],
            "type": "object",
            "properties": {
              "user": {
                "title": lang["User"],
                "type": "string",
              },
              "pass": {
                "title": lang["Password"],
                "type": "string",
              },
            },
          },
          "secure": {
            "title": lang["secure"],
            "type": "boolean",
            "default": false
          },
          "ignoreTLS": {
            "title": lang["ignoreTLS"],
            "type": "boolean",
          },
          "requireTLS": {
            "title": lang["requireTLS"],
            "type": "boolean",
          },
          "port": {
            "title": lang["Port"],
            "type": "integer",
          }
        }
      },
      "detectorMergePamRegionTriggers": {
        "title": lang["detectorMergePamRegionTriggers"],
        "type": "boolean",
        "default": true
      },
      "doSnapshot": {
        "title": lang["doSnapshot"],
        "type": "boolean",
        "default": true
      },
      "discordBot": {
        "title": lang["discordBot"],
        "type": "boolean",
        "default": false
      },
      "dropInEventServer": {
        "title": lang["dropInEventServer"],
        "type": "boolean",
        "default": false
      },
      "ftpServer": {
        "title": lang["ftpServer"],
        "type": "boolean",
        "default": false
      },
      "oldPowerVideo": {
        "title": lang["oldPowerVideo"],
        "type": "boolean",
        "default": false
      },
      "wallClockTimestampAsDefault": {
        "title": lang["wallClockTimestampAsDefault"],
        "type": "boolean",
        "default": true
      },
      "defaultMjpeg": {
        "title": lang["defaultMjpeg"],
        "type": "string",
      },
      "streamDir": {
        "title": lang["streamDir"],
        "type": "string",
      },
      "videosDir": {
        "title": lang["videosDir"],
        "type": "string",
      },
      "windowsTempDir": {
        "title": lang["windowsTempDir"],
        "type": "string",
      },
      "enableFaceManager": {
        "type": "boolean",
        "default": false,
        "title": lang["Enable Face Manager"],
        "description": lang["enableFaceManagerDes"]
      }
    }
  };

  const configurationTab = $("#config");
  const configurationForm = configurationTab.find("form");

  const moduleData = {
    endpoint: null,
    configurationEditor: null
  }

  const handleGetConfigurationData = data => {
    const dataConfig = data.config;
    const dataConfigKeys = Object.keys(dataConfig);
    const schemaItemsKeys = Object.keys(schema.properties);

    const schemaWithoutData = schemaItemsKeys.filter(
      (sk) => !dataConfigKeys.includes(sk)
    );
    const dataWithoutSchema = dataConfigKeys.filter(
      (dk) => !schemaItemsKeys.includes(dk)
    );

    schemaWithoutData.forEach((sk) => {
      const schemaItem = schema.properties[sk];
      const defaultConfig = schemaItem.default;

      data.config[sk] = defaultConfig;
    });

    if (dataWithoutSchema.length > 0) {
      dataWithoutSchema.forEach((dk) => {
        const schemaItem = {
          title: dk,
          options: {
            hidden: true,
          },
        };

        schema.properties[dk] = schemaItem;
      });

      // Set default options
      JSONEditor.defaults.options.theme = "bootstrap3";
      JSONEditor.defaults.options.iconlib = "fontawesome4";
    }

    const configurationEditor = new JSONEditor(
      document.getElementById("configForHumans"), {
      schema: schema,
    }
    );
    window.configurationEditor = configurationEditor;

    configurationEditor.setValue(data.config);

    moduleData.configurationEditor = configurationEditor;
    window.configurationEditor = configurationEditor;
  };

  const handlePostConfigurationData = data => {
    // console.log(data);
  }

  function loadConfiguationIntoEditor(d) {
    moduleData.endpoint = `${superApiPrefix}${$user.sessionKey}/system/configure`;

    $.get(moduleData.endpoint, handleGetConfigurationData);
  }

  var submitConfiguration = function () {
    var errors = configurationEditor.validate();
    console.log(errors.length)
    console.log(errors)
    if (errors.length === 0) {
      var newConfiguration = JSON.stringify(configurationEditor.getValue(), null, 3)
      var html = '<p>This is a change being applied to the configuration file (conf.json). Are you sure you want to do this? You must restart Shinobi for these changes to take effect. <b>The JSON below is what you are about to save.</b></p>'
      html += `<pre>${newConfiguration}</pre>`
      $.confirm.create({
        title: 'Save Configuration',
        body: html,
        clickOptions: {
          class: 'btn-success',
          title: lang.Save,
        },
        clickCallback: function () {
          const requestData = {
            data: newConfiguration
          };

          $.post(moduleData.endpoint, requestData, handlePostConfigurationData);
        }
      })
    } else {
      new PNotify({ text: 'Invalid JSON Syntax, Cannot Save.', type: 'error' });
    }
  };

  configurationTab.find('.submit').click(function () {
    submitConfiguration();
  });

  configurationForm.submit(function (e) {
    e.preventDefault();
    submitConfiguration();
    return false;
  });

  $.ccio.ws.on("f", d => {
    if (d.f === "init_success") {
      loadConfiguationIntoEditor();
    }
  });

})
