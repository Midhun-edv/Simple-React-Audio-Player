import React, { useRef, useState, useEffect } from 'react';
import './style.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStepBackward,
  faBackward,
  faForward,
  faStepForward,
  faPlay,
  faPause,
  faVolumeUp,
  faVolumeMute,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

function App() {
  const [indexAudio, setIndexAudio] = useState(0);
  const currentAudio = useRef(new Audio());
  const [timer, setTimer] = useState('00:00');
  const [barProgressWidth, setBarProgressWidth] = useState(0);
  const [listAudio, setListAudio] = useState([]);
  const [duration, setTotalDuration] = useState('00:00');

  useEffect(() => {
    currentAudio.current = new Audio();

    // Sets up the onTimeUpdate event listener for the audio element
    currentAudio.current.addEventListener('timeupdate', onTimeUpdate);

    // Load playlist from localStorage when the component mounts
    const storedListAudio = JSON.parse(localStorage.getItem('audioPlaylist')) || [];
    console.log('Loaded playlist from localStorage:', storedListAudio);
    setListAudio(storedListAudio);

    return () => {
      // Cleans up when the component unmounts
      currentAudio.current.removeEventListener('timeupdate', onTimeUpdate);
      currentAudio.current = null;
    };
  }, []);

  // Saves playlist to localStorage whenever it changes
  useEffect(() => {
    try {
      // Check if the playlist is not empty before saving it
      if (listAudio.length > 0) {
        localStorage.setItem('audioPlaylist', JSON.stringify(listAudio));
        console.log('Saved playlist to localStorage:', listAudio);
      }
    } catch (error) {
      console.error('Error saving playlist to localStorage:', error);
    }
  }, [listAudio]);

  // Log when the component unmounts
  useEffect(() => {
    return () => {
      console.log('Component is unmounting. Current playlist:', listAudio);
    };
  }, [listAudio]);

  const toggleAudio = () => {
    const player = currentAudio.current;
    const iconPlay = document.querySelector('#icon-play');
    const iconPause = document.querySelector('#icon-pause');
    if (listAudio.length < 2) {
      alert('Please add at least two songs to play.');
      return;
    }

    if (player.paused || player.ended) {
      player.play().then(() => {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
      }).catch((error) => {
        console.error("Error playing audio:", error);
      });
    } else {
      player.pause();
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    }
  };

  const updateStylePlaylist = (oldIndex, newIndex) => {
    const tracks = document.querySelectorAll('.playlist-track-ctn');
    tracks[oldIndex].classList.remove('active-track');
    tracks[newIndex].classList.add('active-track');
  };

  const pauseToPlay = (index) => {
    const player = currentAudio.current;
    player.pause();
    player.currentTime = 0;
    updateStylePlaylist(index, index);
  };

  const createTrackItem = (index, name, duration, author) => (
    <div key={index} className={`playlist-track-ctn${index === indexAudio ? ' active-track' : ''}`} onClick={() => getClickedElement(index)}>
      <div className="playlist-btn-play">
        <FontAwesomeIcon icon={faPlay} height={40} width={40} id={`p-img-${index}`} />
      </div>
      <div className="playlist-info-track">{name || 'Unknown Title'}</div>
      <div className="playlist-duration">{duration || '00:00'}</div>
      <div className="playlist-author">{author || 'Unknown Artist'}</div>
    </div>
  );

  const loadNewTrack = (index) => {
    const player = currentAudio.current;
  
    if (listAudio.length > 0 && listAudio[index]) {
      player.src = listAudio[index].file;
      document.querySelector('.title').innerHTML = listAudio[index].name;
  
      player.load();
  
      player.addEventListener('canplaythrough', () => {
        player.play().then(() => {
          toggleAudio();
          updateStylePlaylist(indexAudio, index);
          setIndexAudio(index);
          updateSongDetails(index);
        }).catch((error) => {
          console.error("Error playing audio:", error);
        });
      });
  
      player.onended = () => {
        // Automatically load and play the next track when the current track ends
        if (index < listAudio.length - 1) {
          const nextIndex = index + 1;
          loadNewTrack(nextIndex);
        } else {
          // If it's the last song, play the first song
          loadNewTrack(0);
        }
      };
      
    }
  };
  

  const onTimeUpdate = () => {
    const player = currentAudio.current;
    const t = player.currentTime;
    setTimer(getMinutes(t));
    setBarProgress();

    if (player.ended) {
      pauseToPlay(indexAudio);

      if (indexAudio < listAudio.length - 1) {
        const nextIndex = indexAudio + 1;
        loadNewTrack(nextIndex);
      }
    }
  };

  const setBarProgress = () => {
    const player = currentAudio.current;
    const progress = (player.currentTime / player.duration) * 100;
    setBarProgressWidth(progress);
  };

  const getMinutes = (t) => {
    let min = parseInt(parseInt(t) / 60);
    let sec = parseInt(t % 60);
    if (sec < 10) {
      sec = `0${sec}`;
    }
    if (min < 10) {
      min = `0${min}`;
    }
    return `${min}:${sec}`;
  };

  const getClickedElement = (index) => {
    if (index === indexAudio) {
      toggleAudio();
    } else {
      loadNewTrack(index);
    }
  };

  const updateSongDetails = (index) => {
    const selectedAudio = listAudio[index];
    const titleElement = document.querySelector('.title');
    const durationElement = document.querySelector('.duration');

    if (selectedAudio) {
      titleElement.textContent = selectedAudio.name;
      durationElement.textContent = selectedAudio.duration;
    }
  };

  const addNewAudio = async (file) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const buffer = e.target.result;
      const audioBlob = new Blob([buffer], { type: file.type });

      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);

      audio.onloadedmetadata = () => {
        const newAudio = {
          name: file.name || 'Unknown Title',
          file: audio.src,
          duration: getMinutes(audio.duration),
          author: 'Unknown Artist',
        };

        // Using a functional update to ensure the latest state is used
        setListAudio((prevListAudio) => {
          const updatedList = [...prevListAudio, newAudio];
          if (prevListAudio.length === 0) {
            const currentIndex = updatedList.length - 1;
            loadNewTrack(currentIndex);
          }
          return updatedList;
        });
      };

      audio.onerror = (error) => {
        console.error("Error loading audio:", error);
      };
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      addNewAudio(files[i]);
    }
  };

  const toggleMute = () => {
    const player = currentAudio.current;
    player.muted = !player.muted;
    const iconVolUp = document.querySelector('#icon-vol-up');
    const iconVolMute = document.querySelector('#icon-vol-mute');

    if (player.muted) {
      iconVolUp.style.display = 'none';
      iconVolMute.style.display = 'block';
    } else {
      iconVolUp.style.display = 'block';
      iconVolMute.style.display = 'none';
    }
  };

  const previous = () => {
    const newIndex = indexAudio > 0 ? indexAudio - 1 : listAudio.length - 1;
    loadNewTrack(newIndex);
  };

  const rewind = () => {
    const player = currentAudio.current;
    const newTime = player.currentTime - 10; // Rewind by 10 seconds
    player.currentTime = Math.max(newTime, 0);
  };

  const forward = () => {
    const player = currentAudio.current;
    const newTime = player.currentTime + 10; // Fast forward by 10 seconds
    player.currentTime = Math.min(newTime, player.duration);
  };

  const next = () => {
    const newIndex = indexAudio < listAudio.length - 1 ? indexAudio + 1 : 0;
    loadNewTrack(newIndex);
  };

  return (
    <div>
      <audio ref={currentAudio}>
        <source id="source-audio" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      <div className="player-ctn">
        <div className="infos-ctn">
          <div className="timer">{timer}</div>
          <div className="title"></div>
          <div className="duration">{duration}</div>
        </div>
        <div id="myProgress">
          <div id="myBar" style={{ width: `${barProgressWidth}%` }}></div>
        </div>
        <div className="btn-ctn">
          <div className="btn-action first-btn" onClick={() => previous()}>
            <div id="btn-faws-back">
              <FontAwesomeIcon icon={faStepBackward} />
            </div>
          </div>
          <div className="btn-action" onClick={() => rewind()}>
            <div id="btn-faws-rewind">
              <FontAwesomeIcon icon={faBackward} />
            </div>
          </div>
          <div className="btn-action" onClick={() => toggleAudio()}>
            <div id="btn-faws-play-pause">
              <FontAwesomeIcon icon={faPlay} id="icon-play" />
              <FontAwesomeIcon icon={faPause} id="icon-pause" style={{ display: 'none' }} />
            </div>
          </div>
          <div className="btn-play" onClick={() => forward()}>
            <div id="btn-faws-forward">
              <FontAwesomeIcon icon={faForward} />
            </div>
          </div>
          <div className="btn-action" onClick={() => next()}>
            <div id="btn-faws-next">
              <FontAwesomeIcon icon={faStepForward} />
            </div>
          </div>
          <div className="btn-mute" id="toggleMute" onClick={() => toggleMute()}>
            <div id="btn-faws-volume">
              <FontAwesomeIcon id="icon-vol-up" icon={faVolumeUp} />
              <FontAwesomeIcon id="icon-vol-mute" icon={faVolumeMute} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="btn-action">
            <label htmlFor="audioFileInput" id="btn-faws-add-audio">
              <FontAwesomeIcon icon={faPlus} style={{ color: '#ffffff' }} />
            </label>
            <input
              type="file"
              id="audioFileInput"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="playlist-ctn">
          {listAudio.map((audio, index) => createTrackItem(index, audio.name, audio.duration, audio.author))}
        </div>
      </div>
    </div>
  );
}

export default App;