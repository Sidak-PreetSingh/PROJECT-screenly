import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import "./home.css";
import { Button, IconButton, TextField, Box, Typography, Paper, Fade, Alert, Snackbar } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertSeverity, setAlertSeverity] = useState("warning");

    const { addToUserHistory } = useContext(AuthContext);

    // Ye rahi updated function
    let handleJoinVideoCall = async () => {
        if (meetingCode.trim() !== "") { // Check: Khali to nahi hai?
            try {
                await addToUserHistory(meetingCode);
                navigate(`/${meetingCode}`);
            } catch (err) {
                console.log(err);
                navigate(`/${meetingCode}`);
            }
        } else {
            setAlertMessage("Please enter a meeting code first!");
            setAlertSeverity("warning");
            setShowAlert(true);
        }
    }

    return (
        <>
            <Box className="homeContainer">
                {/* Enhanced Navigation Bar */}
                <Paper className="navBar" elevation={3}>
                    <Box className="navBrand">
                        <VideoCallIcon className="brandIcon" />
                        <Typography variant="h4" className="brandText">SCREENLY</Typography>
                    </Box>

                    <Box className="navActions">
                        <Box className="navItem" onClick={() => navigate("/history")}>
                            <RestoreIcon className="navIcon" />
                            <Typography variant="body2">History</Typography>
                        </Box>

                        <Button 
                            variant="outlined" 
                            className="logoutBtn"
                            onClick={() => {
                                localStorage.removeItem("token")
                                navigate("/auth")
                            }}
                        >
                            Logout
                        </Button>
                    </Box>
                </Paper>

                {/* Enhanced Meeting Container */}
                <Box className="meetContainer">
                    <Box className="leftPanel">
                        <Paper className="contentCard" elevation={6}>
                            <Typography variant="h3" className="mainTitle">
                                Connect with
                                <span className="highlightText"> Quality</span>
                            </Typography>
                            <Typography variant="h6" className="subtitle">
                                Experience crystal-clear video calls that bring you closer to your loved ones
                            </Typography>
                            
                            <Box className="inputSection">
                                <TextField 
                                    className="meetingInput"
                                    onChange={e => setMeetingCode(e.target.value)} 
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinVideoCall() }}
                                    id="meeting-code" 
                                    label="Enter Meeting Code" 
                                    variant="outlined" 
                                    size="large"
                                    fullWidth
                                />
                                <Button 
                                    onClick={handleJoinVideoCall} 
                                    variant="contained" 
                                    className="joinBtn"
                                    size="large"
                                    endIcon={<VideoCallIcon />}
                                >
                                    CONNECT
                                </Button>
                            </Box>

                            <Typography variant="body2" className="helperText">
                                Press Enter or click CONNECT to join the meeting
                            </Typography>
                        </Paper>
                    </Box>
                    
                    <Box className="rightPanel">
                        <Box className="imageContainer">
                            <img src="/logo3.png" alt="Video Call Illustration" className="mainImage" />
                            <Box className="imageOverlay">
                                <Typography variant="h6" className="overlayText">
                                    Start Your Video Journey
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
            
            {/* Flash Message Alert */}
            <Snackbar 
                open={showAlert} 
                autoHideDuration={4000} 
                onClose={() => setShowAlert(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ marginTop: '80px' }}
            >
                <Alert 
                    onClose={() => setShowAlert(false)} 
                    severity={alertSeverity} 
                    variant="filled"
                    sx={{ 
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 500,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    {alertMessage}
                </Alert>
            </Snackbar>
        </>
    )
}

export default withAuth(HomeComponent)