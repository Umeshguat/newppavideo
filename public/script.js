
const socket = io("/");
const chatInputBox = document.getElementById("chat_message");
const all_messages = document.getElementById("all_messages");
const main__chat__window = document.getElementById("main__chat__window");
const videoGrid = document.getElementById("video-grid");
const username = document.getElementById("username").value;
const myVideo = document.createElement("video");
myVideo.muted = true;

console.log('Username:', username);
// console.log(username);

var peer = new Peer(undefined, {
  // path: "/peerjs",
  // host: "/",
  // port: "3030",
  host: '0.peerjs.com',
  port: 443,
  secure: true,
});

let myVideoStream;
let activeCalls = [];
let peerid;
let screenSharing = false;
let screenShareStream = null;

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;


navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: { echoCancellation: true },
  })
  .then((stream) => {
    myVideoStream = stream;
    const myVideoDiv = addStreamDiv();
    addVideoStream(myVideoDiv, stream, peer.id, username);



    socket.on("user-connected", (data) => {
      const userId = data.userId;
      let name = data.username;
      const remoteUsername = data.username;
      const mydata = { name: username };

      connectToNewUser(userId, myVideoStream, mydata, remoteUsername);
    });

    document.addEventListener("keydown", (e) => {
      if (e.which === 13 && chatInputBox.value != "") {
        socket.emit("message", chatInputBox.value);
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
    })
    socket.on('startshare', ({ share }) => {
      let userDiv = document.getElementById(share.userId);
      if (userDiv) {
        let parentDiv = userDiv.closest('.videos_data');
        if (parentDiv && share.share == true) {
          // parentDiv.classList.replace('videos_data','screen-share');
          parentDiv.classList.add('screen-share');
        } else {
          parentDiv.classList.replace('screen-share', 'screen-share');
        }
      }
    });


  });





peer.on("call", function (call) {
  const localuser = { name: username };
  console.log('call:', localuser);
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream, {
        metadata: localuser
      });
      const video = addStreamDiv();
      const remoteUsername = call.metadata.name;
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, call.peer, remoteUsername);
      });
    },

    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
  activeCalls.push(call);
});

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, USERNAME, id);
});

// CHAT

const connectToNewUser = (userId, streams, mydata, remoteUsername) => {
  console.log('connect:', remoteUsername);
  var call = peer.call(userId, streams, {
    metadata: mydata
  });
  var video = addStreamDiv();
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


  if (!videoEl) {
    console.error("No video element found inside the video container");
    return;
  }

  videoEl.srcObject = stream;
  videoEl.setAttribute('data-stream-id', peer.id);
  const streamIdDiv = videoContainer.querySelectorAll(".user_name")[0]; // First div for stream ID
  const muteStatusDiv = videoContainer.querySelectorAll(".user_name")[1]; // Second div for mute status

  // Set the stream ID in the first div
  streamIdDiv.innerText = streamuser;

  // Function to update mute status
  // const updateMuteStatus = () => {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0) {
    muteStatusDiv.innerHTML = audioTracks[0].enabled ? '<i class="fa fa-microphone"></i>' : '<i class="unmute fa fa-microphone-slash"></i>';
    muteStatusDiv.id = peerid;
  } else {
    muteStatusDiv.innerText = '<i class="fa fa-microphone"></i>';
  }
  // };
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoGrid.append(videoContainer);
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        // 100 / totalUsers + "%";
        "100%"
    }
  }
};

const screenShare = () => {

  screenSharing = true;
  socket.emit("screen-share", { share: true, userId: peer.id });
  navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    .then(screenStream => {
      screenShareStream = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];

      activeCalls.forEach(call => {
        const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
        if (sender) {

          const originalTrack = sender.track;
          sender.replaceTrack(videoTrack);

          videoTrack.onended = () => {
            screenShareStream = null;
            screenSharing = false;
            sender.replaceTrack(originalTrack);
          };
        }
      });
    })
    .catch(err => console.error('Error sharing screen:', err));

}


function stopScreenSharing() {
  if (!screenSharing) return;
  let videoTrack = local_stream.getVideoTracks()[0];
  if (peer) {
    activeCalls.forEach(call => {
      const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
      if (sender) {
        const originalTrack = sender.track; // Save the original track to restore later
        sender.replaceTrack(videoTrack);

        videoTrack.onended = () => {
          sender.replaceTrack(originalTrack);
        };
      }
    });

  }
  screenStream.getTracks().forEach(function (track) {
    track.stop();
  });
  socket.emit("screen-share", { share: false, userId: peer.id });
  screenSharing = false
}


const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
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


//add new video due
const addStreamDiv = () => {
  // Create the parent div for the videos
  const videosDataDiv = document.createElement('div');
  videosDataDiv.classList.add('videos_data');

  // Create the video element
  const videoElement = document.createElement('video');
  // Set the video source here, if available
  videosDataDiv.appendChild(videoElement);

  const userName1Div = document.createElement('div');
  userName1Div.classList.add('user_name');
  userName1Div.textContent = 'Umesh Kumar';
  videosDataDiv.appendChild(userName1Div);

  const userName2Div = document.createElement('div');
  userName2Div.classList.add('user_name');
  // userName2Div.textContent = '';
  videosDataDiv.appendChild(userName2Div);


  return videosDataDiv;

}



//leavemeeting 
const leaveMeeting = () => {

  window.location.href = 'http://localhost:3030/';
  socket.emit("leavemeeting", peer.id);
}






