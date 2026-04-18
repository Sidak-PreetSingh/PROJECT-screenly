import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Box, Typography, Paper, Fade, Container } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import "./lobby.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonIcon from '@mui/icons-material/Person';
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    const chatEndRef = useRef(null); // Ise zaroor add karein
    const isReplacingStreamRef = useRef(false);
    const screenStreamRef = useRef(null);
    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();
    
    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(true);

    let [audio, setAudio] = useState(true);

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");
    let [flashMessage, setFlashMessage] = useState("");
    let [showLocalOnMainStage, setShowLocalOnMainStage] = useState(true);

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    const shouldMirrorLocalVideo = !screen;
    const flashTimeoutRef = useRef(null);

    const showFlashMessage = (text) => {
        setFlashMessage(text);
        if (flashTimeoutRef.current) {
            clearTimeout(flashTimeoutRef.current);
        }
        flashTimeoutRef.current = setTimeout(() => {
            setFlashMessage("");
        }, 2500);
    };

    const closeConnection = (peerId) => {
        const peer = connections[peerId];
        if (!peer) return;
        try {
            peer.onicecandidate = null;
            peer.onaddstream = null;
            if (peer.signalingState !== "closed") {
                peer.close();
            }
        } catch (e) {
            console.log("Error closing peer connection:", e);
        }
        delete connections[peerId];
    };

    const getOrCreateConnection = (peerId) => {
        const existing = connections[peerId];
        if (existing && existing.signalingState !== "closed") {
            return existing;
        }
        if (existing && existing.signalingState === "closed") {
            delete connections[peerId];
        }

        const peerConnection = new RTCPeerConnection(peerConfigConnections);
        peerConnection.onicecandidate = function (event) {
            if (event.candidate != null && socketRef.current) {
                socketRef.current.emit('signal', peerId, JSON.stringify({ 'ice': event.candidate }))
            }
        };

        peerConnection.onaddstream = (event) => {
            console.log("STREAM RECEIVED FROM: ", peerId);
            setVideos(prevVideos => {
                const videoExists = prevVideos.find(v => v.socketId === peerId);
                if (videoExists) {
                    return prevVideos.map(v =>
                        v.socketId === peerId ? { ...v, stream: event.stream } : v
                    );
                }
                return [...prevVideos, {
                    socketId: peerId,
                    stream: event.stream,
                    autoplay: true,
                    playsinline: true
                }];
            });
        };

        connections[peerId] = peerConnection;
        return peerConnection;
    };

    const safeCreateOffer = async (peerId) => {
        const peerConnection = connections[peerId];
        if (!peerConnection || peerConnection.signalingState === "closed") return;
        try {
            const description = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(description);
            socketRef.current?.emit('signal', peerId, JSON.stringify({ 'sdp': peerConnection.localDescription }));
        } catch (e) {
            console.log("createOffer failed for peer:", peerId, e);
        }
    };

    const attachStreamToPeerConnection = (peerConnection, stream) => {
        if (!peerConnection || peerConnection.signalingState === "closed" || !stream) return;
        try {
            if (peerConnection.removeStream && peerConnection.__localStreamRef) {
                peerConnection.removeStream(peerConnection.__localStreamRef);
            }
            peerConnection.addStream(stream);
            peerConnection.__localStreamRef = stream;
        } catch (e) {
            console.log("Failed to sync local stream with peer:", e);
        }
    };

    const syncLocalStreamToAllPeers = () => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            const peerConnection = connections[id];
            if (!peerConnection || peerConnection.signalingState === "closed") continue;
            attachStreamToPeerConnection(peerConnection, window.localStream);
            safeCreateOffer(id);
        }
    };

    // TODO
    // if(isChrome() === false) {


    // }

    // useEffect(() => {
    //     console.log("HELLO")
    //     getPermissions();

    // })
    useEffect(() => {
    getPermissions();
    }, []); // Ye [] lagane se ye sirf ek baar chalega jab page load hoga

    // Initialize camera preview for lobby
    useEffect(() => {
        if (askForUsername && videoAvailable) {
            initializeLobbyCamera();
        }
        return () => {
            // Cleanup lobby camera stream when leaving lobby
            if (window.lobbyStream) {
                window.lobbyStream.getTracks().forEach(track => track.stop());
                window.lobbyStream = null;
            }
        };
    }, [askForUsername, videoAvailable]);

    // ... existing useEffects ke niche
useEffect(() => {
    // Jab bhi messages array update hoga, ye automatically bottom tak scroll karega
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);



    const getPreferredMediaStream = async (videoEnabled, audioEnabled) => {
        const constraints = {
            video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            audio: audioEnabled
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            if (videoEnabled || audioEnabled) {
                return await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: audioEnabled });
            }
            throw error;
        }
    };

    let getDislayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => {
                    console.log(e);
                    setScreen(false);
                })
        }
    }

    const getPermissions = async () => {
        setScreenAvailable(Boolean(navigator.mediaDevices?.getDisplayMedia));
        try {
            const userMediaStream = await getPreferredMediaStream(true, true);
            const hasVideo = userMediaStream.getVideoTracks().length > 0;
            const hasAudio = userMediaStream.getAudioTracks().length > 0;

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);
            // Do not attach preview stream before user explicitly connects.
            userMediaStream.getTracks().forEach((track) => track.stop());
            console.log("Initial media ready", { hasVideo, hasAudio });
        } catch (error) {
            setVideoAvailable(false);
            setAudioAvailable(false);
            console.log("Media permission/init failed", error);
        }
    };

    useEffect(() => {
        if (!askForUsername && video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);

        }


    }, [video, audio, askForUsername])
    const attachLocalStream = (stream) => {
        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
            localVideoref.current.play().catch(() => { });
        }
    };

    const initializeLobbyCamera = async () => {
        try {
            // Get a simple video stream for lobby preview
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false 
            });
            
            window.lobbyStream = stream;
            
            // Attach to lobby video element
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
                localVideoref.current.play().catch((error) => {
                    console.log("Lobby video play failed:", error);
                });
            }
        } catch (error) {
            console.log("Lobby camera initialization failed:", error);
        }
    };

    const createLocalStream = async (videoEnabled, audioEnabled) => {
        if (!(videoEnabled || audioEnabled)) return null;
        const stream = await getPreferredMediaStream(videoEnabled, audioEnabled);
        attachLocalStream(stream);
        return stream;
    };

    let getMedia = async () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);

        try {
            await createLocalStream(videoAvailable, audioAvailable);
        } catch (e) {
            console.log("Unable to initialize local media:", e);
        }

        connectToSocketServer();
    }




    let getUserMediaSuccess = (stream) => {
        isReplacingStreamRef.current = true;
        try {
            window.localStream.getTracks().forEach(track => {
                track.onended = null;
                track.stop();
            })
        } catch (e) { console.log(e) }

        window.localStream = stream
        // localVideoref.current.srcObject = stream
        if (localVideoref.current) {
        localVideoref.current.srcObject = stream;
        localVideoref.current.play().catch(() => { });
        }

        syncLocalStreamToAllPeers();

        stream.getTracks().forEach(track => track.onended = () => {
            if (isReplacingStreamRef.current) return;
            console.log("Local camera/audio track ended. Trying to reacquire media.");
            getUserMedia();
        })
        isReplacingStreamRef.current = false;
    }

    const createBlackVideoTrack = ({ width = 640, height = 480 } = {}) => {
        const canvas = Object.assign(document.createElement("canvas"), { width, height });
        const context = canvas.getContext("2d");
        context.fillStyle = "black";
        context.fillRect(0, 0, width, height);
        const stream = canvas.captureStream(15);
        return stream.getVideoTracks()[0];
    };

    const createSilentAudioTrack = () => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    let getUserMedia = async () => {
        try {
            // Camera ON path (normal behavior).
            if (video && videoAvailable) {
                const stream = await getPreferredMediaStream(true, audio && audioAvailable);
                getUserMediaSuccess(stream);
                return;
            }

            // Camera OFF path: always send a black video track so remote sees blank, not frozen frame.
            const blackTrack = createBlackVideoTrack();
            const tracks = [blackTrack];

            if (audio && audioAvailable) {
                const audioStream = await getPreferredMediaStream(false, true);
                const audioTrack = audioStream.getAudioTracks()[0];
                if (audioTrack) tracks.push(audioTrack);
            } else {
                tracks.push(createSilentAudioTrack());
            }

            const placeholderStream = new MediaStream(tracks);
            getUserMediaSuccess(placeholderStream);
        } catch (e) {
            console.log(e);
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        isReplacingStreamRef.current = true;
        screenStreamRef.current = stream;
        try {
            window.localStream.getTracks().forEach(track => {
                track.onended = null;
                track.stop();
            })
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        syncLocalStreamToAllPeers();

        stream.getTracks().forEach(track => track.onended = () => {
            if (isReplacingStreamRef.current) return;
            screenStreamRef.current = null;
            setScreen(false)
            getUserMedia()

        })
        isReplacingStreamRef.current = false;
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            const peerConnection = getOrCreateConnection(fromId);
            if (signal.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        peerConnection.createAnswer().then((description) => {
                            peerConnection.setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': peerConnection.localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
                closeConnection(id);
                showFlashMessage("A user left the meeting");
                setShowLocalOnMainStage(false);
            })

            socketRef.current.on('user-joined', (id, clients) => {
                setShowLocalOnMainStage(true);
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;

                    const peerConnection = getOrCreateConnection(socketListId);


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        attachStreamToPeerConnection(peerConnection, window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue
                        if (connections[id2]?.signalingState === "closed") continue;

                        try {
                            attachStreamToPeerConnection(connections[id2], window.localStream)
                        } catch (e) { }

                        safeCreateOffer(id2);
                    }
                }
            })
        })
    }

    useEffect(() => {
        return () => {
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
            Object.keys(connections).forEach((peerId) => closeConnection(peerId));
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }

    useEffect(() => {
        if (screen) {
            getDislayMedia();
        }
    }, [screen])

    const stopScreenSharing = () => {
        try {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => {
                    track.onended = null;
                    track.stop();
                });
                screenStreamRef.current = null;
            }
        } catch (e) {
            console.log(e);
        }
        setScreen(false);
        getUserMedia();
    };

    let handleScreen = () => {
        if (screen) {
            stopScreenSharing();
            return;
        }
        setScreen(true);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        Object.keys(connections).forEach((peerId) => closeConnection(peerId));
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        window.location.href = "/"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current && !showModal) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    let connect = async () => {
        // Stop lobby camera stream
        if (window.lobbyStream) {
            window.lobbyStream.getTracks().forEach(track => track.stop());
            window.lobbyStream = null;
        }
        
        setAskForUsername(false);
        await getMedia();
    }


    return (
        <div>

            {askForUsername === true ?

                <Fade in={true} timeout={800}>
                    <Box className="lobbyContainer">
                        {/* Animated Background */}
                        <Box className="lobbyBackground">
                            <Box className="floatingParticles"></Box>
                            <Box className="floatingParticles2"></Box>
                        </Box>

                        {/* Main Content */}
                        <Container maxWidth="sm">
                            <Paper className="lobbyCard" elevation={10}>
                                {/* Header Section */}
                                <Box className="lobbyHeader">
                                    <VideoCallIcon className="lobbyIcon" />
                                    <Typography variant="h3" className="lobbyTitle">
                                        Enter into Lobby
                                    </Typography>
                                    <Typography variant="body1" className="lobbySubtitle">
                                        Join the video meeting with your username
                                    </Typography>
                                </Box>

                                {/* Form Section */}
                                <Box className="lobbyForm">
                                    <Box className="inputGroup">
                                        <PersonIcon className="inputIcon" />
                                        <TextField 
                                            className="lobbyInput"
                                            id="username-input" 
                                            label="Enter Your Username" 
                                            value={username} 
                                            onChange={e => setUsername(e.target.value)} 
                                            variant="outlined" 
                                            size="large"
                                            fullWidth
                                            autoFocus
                                        />
                                    </Box>

                                    <Button 
                                        className="connectBtn"
                                        variant="contained" 
                                        onClick={connect}
                                        size="large"
                                        endIcon={<VideoCallIcon />}
                                        disabled={!username.trim()}
                                    >
                                        CONNECT
                                    </Button>
                                </Box>

                                {/* Video Preview Section */}
                                <Box className="videoPreview">
                                    <Typography variant="body2" className="previewLabel">
                                        Camera Preview
                                    </Typography>
                                    <Box className="videoContainer">
                                        <video 
                                            ref={localVideoref} 
                                            className="previewVideo"
                                            autoPlay 
                                            muted 
                                        />
                                        <Box className="videoOverlay">
                                            <Typography variant="caption">
                                                {videoAvailable ? "Camera Ready" : "Camera Off"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Instructions */}
                                <Box className="instructions">
                                    <Typography variant="body2" className="instructionText">
                                        💡 Enter your username and click CONNECT to join the meeting
                                    </Typography>
                                </Box>
                            </Paper>
                        </Container>
                    </Box>
                </Fade> :


    <div className={styles.meetVideoContainer}>
    {flashMessage && <div className={styles.flashMessage}>{flashMessage}</div>}
    {/* 1. Remote Videos (Conference View) */}
   <div className={styles.conferenceView}>
    {videos.length === 0 && showLocalOnMainStage && window.localStream && (
        <video
            className={styles.remoteVideo}
            ref={(ref) => {
                if (ref && !ref.srcObject) {
                    ref.srcObject = window.localStream;
                }
            }}
            autoPlay
            muted
            playsInline
            style={{ transform: shouldMirrorLocalVideo ? "scaleX(-1)" : "none" }}
        />
    )}
    {videos.length === 0 && !showLocalOnMainStage && (
        <div className={styles.emptyStageMessage}>
            User left the meeting. Waiting for participant...
        </div>
    )}
    {videos.map((video) => (
        <video
            key={video.socketId}
            id={video.socketId} // Socket ID as ID helps in debugging
            ref={(ref) => {
                if (ref && video.stream) {
                    ref.srcObject = video.stream;
                }
            }}
            autoPlay
            playsInline
            className={styles.remoteVideo}
        />
    ))}
</div>

    {/* 2. Floating Chat Modal */}
    {showModal && (
        <div className={styles.chatRoom}>
            <div className={styles.chatContainer}>
                <h1>Chat</h1>
                <div className={styles.chattingDisplay}>
                    {messages.length > 0 ? messages.map((item, index) => (
                        <div style={{ marginBottom: "20px" }} key={index}>
                            <p style={{ fontWeight: "bold", margin: 0 }}>{item.sender}</p>
                            <p style={{ margin: 0 }}>{item.data}</p>
                        </div>
                    )) : <p>No Messages Yet</p>}
                    <div ref={chatEndRef} /> {/* Auto-scroll target */}
                </div>

                <div className={styles.chattingArea}>
                    <TextField 
                        fullWidth
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        label="Enter Your chat" 
                        variant="outlined" 
                    />
                    <Button variant='contained' onClick={sendMessage}>Send</Button>
                </div>
            </div>
        </div>
    )}

    {/* 3. Bottom Action Bar */}
    <div className={styles.buttonContainers}>
        <IconButton onClick={handleVideo} style={{ color: "white" }}>
            {video ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        
        <IconButton onClick={handleEndCall} style={{ color: "#ff4444" }}>
            <CallEndIcon />
        </IconButton>

        <IconButton onClick={handleAudio} style={{ color: "white" }}>
            {audio ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        {screenAvailable && (
            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
        )}

        <Badge badgeContent={newMessages} max={99} color="primary">
            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                <ChatIcon />
            </IconButton>
        </Badge>
    </div>

    {/* 4. Small Local Preview */}
    <video 
        className={styles.meetUserVideo}
        style={{ transform: shouldMirrorLocalVideo ? "scaleX(-1)" : "none" }}
        ref={localVideoref} 
        autoPlay 
        muted 
        playsInline 
    />
</div>

            }

        </div>
    )
}
