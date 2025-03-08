
const socket = io("/");
const chatInputBox = document.getElementById("chat_message");
const all_messages = document.getElementById("all_messages");
const main__chat__window = document.getElementById("main__chat__window");
const videoGrid = document.getElementById("video-grid");
const shareGrid = document.getElementById("video-grid");
const username = document.getElementById("username").value;
const myVideo = document.createElement("video");
myVideo.muted = true;

console.log('Username:', username);
// console.log(username);

var peer = new Peer(undefined, {
  host: "0.peerjs.com",
  port: 443,
  secure: true,
  config: {
    iceServers: [
      {
        urls: "turn:relay1.expressturn.com:3478",
        username: "ef917AZ9A6TNUNC9J8",
        credential: "bGH5SwDCb1THVtHF"
      }
    ]
  }
});

let myVideoStream;
let activeCalls = [];
let peerid = null;
let screenSharing = false;
let screenShareStream = null;
let connectedPeers = {};

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;


// navigator.mediaDevices.getUserMedia({
//   video: true,
//   audio: true,
// })
//   .then((stream) => {
//     myVideoStream = stream;
//     const myVideoDiv = addStreamDiv(true);

//     addVideoStream(myVideoDiv, stream, peerid, username);

//     socket.on("user-connected", (data) => {
//       console.log(data);
//       const userId = data.userId;
//       const remoteUsername = data.username;
//       const mydata = { name: username };
//       connectToNewUser(userId, stream, mydata, remoteUsername);
//     });

//     document.addEventListener("keydown", (e) => {
//       if (e.which === 13 && chatInputBox.value != "") {
//         const messagedata = username + " : " + chatInputBox.value;
//         socket.emit("message", messagedata);
//         chatInputBox.value = "";
//       }
//     });

//     socket.on("createMessage", (msg) => {
//       let li = document.createElement("li");
//       li.innerHTML = msg;
//       all_messages.append(li);
//       main__chat__window.scrollTop = main__chat__window.scrollHeight;
//     });


//     socket.on("update-mute-status", ({ muted, userId }) => {
//       user = muted.userId
//       let userDiv = document.getElementById(user);
//       if (userDiv) {
//         userDiv.innerHTML = muted.muted;
//       }
//     });

//     socket.on('user-leaved-meeting', (userId) => {
//       let userDiv = document.getElementById(userId);
//       console.log(userDiv);
//       if (userDiv) {
//         let parentDiv = userDiv.closest('.videos_data');
//         if (parentDiv) {
//           parentDiv.remove();
//         }
//       }
//     })
//     socket.on('startshare', ({ share }) => {
      
//       // let userDiv = document.getElementById(share.userId + '__screenshare');
//       let userDiv = document.querySelector(`video[data-stream-id="${share.userId}_screenshare"]`);
//       if (userDiv) {
//         console.log('find');
//         let parentDiv = userDiv.closest('.videos_data');
//         if (parentDiv && share.share == true) { 
//           parentDiv.classList.add('screen-share');
//         } else {
//           parentDiv.remove();
//           parentDiv.classList.remove('screen-share');
//         }
//       }
//     });
//   });


const initializePeer = () => {
  return new Promise((resolve) => {
    peer.on("open", (id) => {
      peerid = id;
      socket.emit("join-room", ROOM_ID, USERNAME, id);
      console.log('peerid:', id);
      resolve(id);
    });
  });
};

const startVideoStream = async () => {
  await initializePeer();

  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    const myVideoDiv = addStreamDiv(true);

    addVideoStream(myVideoDiv, stream, peerid, username);

    socket.on("user-connected", (data) => {
      console.log(data);
      const userId = data.userId;
      const remoteUsername = data.username;
      const mydata = { name: username };

      connectToNewUser(userId, stream, mydata, remoteUsername);
    });

    document.addEventListener("keydown", (e) => {
      if (e.which === 13 && chatInputBox.value != "") {
        const messagedata = username + " : " + chatInputBox.value;
        socket.emit("message", messagedata);
        chatInputBox.value = "";
      }
    });

    socket.on("createMessage", (msg) => {
      let li = document.createElement("li");
      li.innerHTML = msg;
      all_messages.append(li);
      main__chat__window.scrollTop = main__chat__window.scrollHeight;
    });

    socket.on("update-mute-status", ({ muted, userId }) => {
      user = muted.userId
      let userDiv = document.getElementById(user);
      if (userDiv) {
        userDiv.innerHTML = muted.muted;
      }
    });

    socket.on('user-leaved-meeting', (userId) => {
      let userDiv = document.getElementById(userId);
      console.log(userDiv);
      if (userDiv) {
        let parentDiv = userDiv.closest('.videos_data');
        if (parentDiv) {
          parentDiv.remove();
        }
      }
    });

    socket.on('startshare', ({ share }) => {
      // let userDiv = document.getElementById(share.userId);
      let userDiv = document.querySelector(`video[data-stream-id="${share.userId}_screenshare"]`);
      if (userDiv) {
        let parentDiv = userDiv.closest('.videos_data');
        if (parentDiv && share.share == true) {
          parentDiv.classList.add('screen-share');
        } else {
          parentDiv.remove();
          // parentDiv.classList.remove('screen-share');
        }
      }
    });
  });
};

startVideoStream();




peer.on("call", function (call) {
  const localuser = { name: username };
  console.log('call:', localuser);
    getUserMedia({ video: true, audio: true },
        function (stream) {
          call.answer(stream, {
            metadata: localuser
          });
          const video = addStreamDiv(false);
          const remoteUsername = call.metadata.name;
          call.on("stream", function (remoteStream) {
            addVideoStream(video, remoteStream, call.peer, remoteUsername);
          });
        },
      function (err) {
        console.log("Failed to get local stream", err);
      }
    );
    connectedPeers[call.peer] = call;
    activeCalls.push(call);
  });

// peer.on("open", (id) => {
//   socket.emit("join-room", ROOM_ID, USERNAME, id);
// });

// CHAT

const connectToNewUser = (userId, streams, mydata, remoteUsername) => {
  console.log('connect:', remoteUsername);
  var call = peer.call(userId, streams, {
    metadata: mydata
  });
  connectedPeers[userId] = call;
  var video = addStreamDiv(false);
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, call.peer, remoteUsername);
  });
  activeCalls.push(call);
  if (screenSharing && screenShareStream) {
    const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
    if (sender) {
      sender.replaceTrack(screenShareStream.getVideoTracks()[0]);
    }
  }
};







const addVideoStream = (videoContainer, stream, peerid, streamuser) => {

  if (!peerid) {
    peerid = peer.id;
  }
  const videoEl = videoContainer.querySelector("video");
  // if (!videoEl) {
  //   console.error("No video element found inside the video container");
  //   return;
  // }

  videoEl.srcObject = stream;
  if (streamuser == 'Screen sharing') {
    videoEl.setAttribute('data-stream-id', peerid + '_screenshare');
  } else {
    videoEl.setAttribute('data-stream-id', peerid);
  }

  const streamIdDiv = videoContainer.querySelectorAll(".user_name")[0]; // First div for stream ID
  const muteStatusDiv = videoContainer.querySelectorAll(".user_name")[1]; // Second div for mute status

  muteStatusDiv.classList.add('micbutton'); 

  streamIdDiv.innerText = streamuser;

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0) {
    muteStatusDiv.innerHTML = audioTracks[0].enabled ? '<i class="fa fa-microphone"></i>' : '<i class="unmute fa fa-microphone-slash"></i>';
    muteStatusDiv.id = peerid;
  }

  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoGrid.append(videoContainer);
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        "100%"
    }
  }
};


let screenShareCall = {};
const screenShare = () => {
  if (!screenSharing) {
    screenSharing = true;

     navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      .then(screenStream => {
        screenShareStream = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = stopScreenSharing;

        const localVideo = addStreamDiv(false);
        addVideoStream(localVideo, screenStream, peer.id, 'Screen sharing');

        for (const peerId in connectedPeers) {
          const call = peer.call(peerId, screenStream, {
            metadata: { name: "Screen sharing" }
          });
          screenShareCall[peerId] = call;
          console.log('screen share');
          call.on('close', () => {

          });
        }
        setStopScreenShare();
        socket.emit("screen-share", { share: true, userId: peer.id });
      })
      .catch(err => {
        console.error('Error sharing screen:', err);
        screenSharing = false; // Reset flag if sharing fails
      });
  } else {
    stopScreenSharing();
  }
};




function stopScreenSharing() {

  for (const peerId in screenShareCall) {
    if (screenShareCall.hasOwnProperty(peerId)) {
      screenShareCall[peerId].close();
      delete screenShareCall[peerId];
    }
  }

  socket.emit("screen-share", { share: false, userId: peer.id });
  setPlayScreenShare();
  screenSharing = false;
  screenShareStream = null;
}

const playStop = () => {
  const videoTracks = myVideoStream ? myVideoStream.getVideoTracks() : [];

  if (videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
    console.log(videoTracks);
    videoTracks.forEach(track => track.stop());
    setPlayVideo();

  } else {
    myVideoStream.getTracks().forEach(track => track.stop());
    myVideoStream = null;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(reStreaming => {
        myVideoStream = reStreaming; // Reassign stream
        const videoTrackstram = reStreaming.getVideoTracks()[0];
        setStopVideo();

        activeCalls.forEach(call => {
          let videoSender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrackstram);
          }
        });

        peerid = peer.id;
        const videoElement = document.querySelector(`video[data-stream-id="${peerid}"]`);
        if (videoElement) {
          videoElement.srcObject = myVideoStream; // Re-assign stream to video element
          videoElement.play().catch(err => console.error("Error playing video:", err));
        }
      })
  }
};

//mute unmute 
const muteUnmute = () => {

  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  const myMuteStatusDiv = document.querySelector("#video-grid .videos_data:first-child .user_name:nth-child(3)");
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
    myMuteStatusDiv.innerText = 'Muted';
    socket.emit("mute-status-changed", { muted: '<i class="unmute fa fa-microphone-slash"></i>', userId: myMuteStatusDiv.id });
  } else {
    setMuteButton();
    myMuteStatusDiv.innerText = 'Unmuted';
    myVideoStream.getAudioTracks()[0].enabled = true;
    socket.emit("mute-status-changed", { muted: '<i class="fa fa-microphone"></i>', userId: myMuteStatusDiv.id });
  }
};



const setPlayVideo = () => {
  const html = `<i class="unmute fa fa-pause-circle"></i>
  <span class="unmute">Resume Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setStopVideo = () => {
  const html = `<i class=" fa fa-video-camera"></i>
  <span class="">Pause Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `<i class="unmute fa fa-microphone-slash"></i>
  <span class="unmute">Unmute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};
const setMuteButton = () => {
  const html = `<i class="fa fa-microphone"></i>
  <span>Mute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

const setStopScreenShare = () => {

  const html = `<i class="unmute fa fa-desktop"></i>
    <span class="unmute">Stop Screen Share</span>`;
  document.getElementById("screenshare").innerHTML = html;

};

const setPlayScreenShare = () => {

  const html = `<i class=" fa fa-desktop"></i>
    <span class=""> Screen Share</span>`;
  document.getElementById("screenshare").innerHTML = html;

};


//add new video due
const addStreamDiv = (isMyVideo = false) => {

  const videosDataDiv = document.createElement('div');
  videosDataDiv.classList.add('videos_data');
  const videoElement = document.createElement('video');

  if (isMyVideo) {
    videoElement.muted = true;
  }

  videosDataDiv.appendChild(videoElement);

  const userName1Div = document.createElement('div');
  userName1Div.classList.add('user_name');
  userName1Div.textContent = 'Umesh Kumar';
  videosDataDiv.appendChild(userName1Div);

  const userName2Div = document.createElement('div');
  userName2Div.classList.add('user_name');
  videosDataDiv.appendChild(userName2Div);

  return videosDataDiv;

}



//leavemeeting 
const leaveMeeting = () => {

  window.location.href = 'https://conference.vijayabooks.in';
  socket.emit("leavemeeting", peer.id);
}



const toggleRemoteMic = (peerId) => {
  console.log('Attempting to toggle mic for peerId:', peerId);
  console.log('Active calls:', activeCalls);
  const call = activeCalls.find(call => call.peer === peerId);

  if (!call) {
    console.error('Call not found for peer:', peerId);
    return;
  }

  console.log('Found call:', call);

  const sender = call.peerConnection.getSenders().find(sender => sender.track.kind === 'audio');
  if (!sender) {
    console.error('Audio track not found for peer:', peerId);
    return;
  }

  const audioTrack = sender.track;
  audioTrack.enabled = !audioTrack.enabled;
  const muteStatusDiv = document.getElementById(peerId);
  if (muteStatusDiv) {
    muteStatusDiv.innerHTML = audioTrack.enabled ? '<i class="fa fa-microphone"></i>' : '<i class="unmute fa fa-microphone-slash"></i>';
  } else {
    console.error('Mute status div not found for peer:', peerId);
  }

  socket.emit("mute-status-changed", { muted: audioTrack.enabled ? '<i class="fa fa-microphone"></i>' : '<i class="unmute fa fa-microphone-slash"></i>', userId: peerId });
};

document.addEventListener("DOMContentLoaded", function () {
  const videoGrid = document.getElementById("video-grid");

  videoGrid.addEventListener("click", function (event) {
      const micButton = event.target.closest(".micbutton"); // Find closest mic button
      if (micButton) {
          console.log("Clicked mic button ID:", micButton.id);

          // alert(micButton.id);
          toggleRemoteMic(micButton.id);
      }
  });
});


