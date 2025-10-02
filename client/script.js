import { io } from "socket.io-client";

const socket = io("192.168.1.170:3000");

const pc_config = {
  iceServers: []
}

const pc = new RTCPeerConnection(pc_config);

pc.onicecandidate = e => {
  if (e.candidate) {
    console.log('onicecandidate');
    socket.emit('candidate', e.candidate);
  } else {
    console.log("ICE gathering complete");
  }
}

pc.onconnectionstatechange = e => {
  console.log('connection state change');
  console.log(e);
}

pc.ontrack = ev => {
  console.log('add remote stream success');
  setRemoteStream(ev.streams[0]);
}

socket.on("connect", () => {
  console.log("Connected to signaling server");
});

socket.on("initiateOffer", async () => {
  await setLocalStream();
  createOffer();
})

socket.on("getOffer", (sdp) => {
  console.log("Creating answer");
  createAnswer(sdp);
})

socket.on("getAnswer", async (sdp) => {
  console.log("Setting remote description")
  await pc.setRemoteDescription(sdp);
})

socket.on("getCandidate", (candidate) => {
  console.log('getCandidate received');
  pc.addIceCandidate(new RTCIceCandidate(candidate)).then(() => {
    console.log('candidate add success');
  })
})

const createOffer = async () => {
  console.log("create offer");
  pc
    .createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
    .then(async (sdp) => {
      await pc.setLocalDescription(sdp);
      socket.emit("offer", sdp);
    })
    .catch(error => {
      console.log(error);
    });
};

const createAnswer = async (sdp) => {
  await pc.setRemoteDescription(sdp).then(() => {
    console.log("answer set remote description success");
    pc
      .createAnswer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      })
      .then(async (sdp1) => {
        console.log("create answer");
        await pc.setLocalDescription(sdp1);
        socket.emit("answer", sdp1);
      })
      .catch(error => {
        console.log(error);
      });
  });
};

const setLocalStream = async () => {
  try {
    console.log("setting local stream");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const video = document.getElementById("localCam");
    video.srcObject = stream;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
};

const setRemoteStream = async (stream) => {
  try {
    console.log('setting remote stream');
    const remoteVideo = document.getElementById("remoteCam");
    remoteVideo.srcObject = stream;
  } catch (error) {
    console.error("Error accessing remote stream.", error);
  }
}

setLocalStream();