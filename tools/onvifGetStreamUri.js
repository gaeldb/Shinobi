const fetch = require('node-fetch');
const dgram = require('dgram');
const parseString = require('xml2js').parseString;
const base64 = require('base-64');

const USERNAME = process.argv[2]
const PASSWORD = process.argv[3]

if(!USERNAME || !PASSWORD){
    console.log(`Missing Username and/or Password!`)
    console.log(`Example : node ./onvifGetStreamUri.js "USERNAME" "PASSWORD"`)
    console.log(`Put the quotations seen in the example!`)
    return
}

function cleanKeys(obj) {
  const cleanKey = (key) => key.includes(':') ? key.split(':').pop() : key;

  if (Array.isArray(obj)) {
    return obj.map(cleanKeys);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((newObj, key) => {
      newObj[cleanKey(key)] = cleanKeys(obj[key]);
      return newObj;
    }, {});
  }
  return obj;
}
async function getStreamUri(deviceXAddr, username, password) {
  let envelope = `
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
      <s:Body>
        <GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl" />
      </s:Body>
    </s:Envelope>
  `;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password),
    },
    body: envelope,
  };

  let response = await fetch(deviceXAddr, options);
  let body = await response.text();

  parseString(body, async (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    const soapBody = cleanKeys(result).Envelope.Body[0]
    if (soapBody.Fault) {
      console.log(deviceXAddr,'Not Authorized');
      return;
    }
    try{
        var profiles = soapBody.GetProfilesResponse[0].Profiles;
    }catch(err){
        console.log(err.stack)
        console.error(deviceXAddr,`getStreamUri soapBody on ERROR`,JSON.stringify(soapBody,null,3))
        return
    }
    if (!profiles || !profiles.length) {
      console.log(deviceXAddr,'No profiles found');
      return;
    }

    const firstProfileToken = profiles[0]['$']['token'];

    envelope = `
      <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
        <s:Body>
          <GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">
            <StreamSetup>
              <Stream xmlns="http://www.onvif.org/ver10/schema">RTP-Unicast</Stream>
              <Transport xmlns="http://www.onvif.org/ver10/schema">
                <Protocol>RTSP</Protocol>
              </Transport>
            </StreamSetup>
            <ProfileToken>${firstProfileToken}</ProfileToken>
          </GetStreamUri>
        </s:Body>
      </s:Envelope>
    `;

    options.body = envelope;
    response = await fetch(deviceXAddr, options);
    body = await response.text();

    parseString(body, (err, result) => {
      if (err) {
        console.error(err);
        return;
      }

      const uri = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['trt:GetStreamUriResponse'][0]['trt:MediaUri'][0]['tt:Uri'][0];
      console.log('Stream URI:', uri);
    });
  });
}

const DISCOVER_MSG = Buffer.from(`
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
              xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
              xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
    <s:Header>
      <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
      <a:MessageID>uuid:1000-3000-5000-70000000000000</a:MessageID>
      <a:ReplyTo>
        <a:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</a:Address>
      </a:ReplyTo>
      <a:To s:mustUnderstand="1">urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
    </s:Header>
    <s:Body>
      <d:Probe>
        <d:Types>dn:NetworkVideoTransmitter</d:Types>
      </d:Probe>
    </s:Body>
  </s:Envelope>
`);

const socket = dgram.createSocket('udp4');
socket.bind(() => {
  socket.setBroadcast(true);
  socket.setMulticastTTL(128);
  socket.addMembership('239.255.255.250');
  socket.send(DISCOVER_MSG, 0, DISCOVER_MSG.length, 3702, '239.255.255.250');
});

socket.on('message', function (message, rinfo) {
  parseString(message, (err, result) => {
    if (err) {
      console.error('Failed to parse XML', err);
      return;
    }
    const cleanJson = cleanKeys(result)
    if (!cleanJson.Envelope || !cleanJson.Envelope.Body) {
      console.error('Unexpected message format', result);
      console.error('cleanJson', cleanJson);
      return;
    }

    const soapBody = cleanJson.Envelope.Body[0];
    const probeMatches = soapBody.ProbeMatches;
    if (!probeMatches) {
      console.error('No probe matches in message', soapBody);
      return;
    }

    const probeMatch = probeMatches[0].ProbeMatch[0];
    if (!probeMatch) {
      console.error('No probe match in probe matches', probeMatches);
      return;
    }
    let xAddrs = probeMatch.XAddrs[0];
    console.log('Found ONVIF device', xAddrs);
    getStreamUri(xAddrs, USERNAME, PASSWORD)
        .catch(err => console.error('Failed to get stream URI', err));
  });
});
