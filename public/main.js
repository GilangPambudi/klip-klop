let isSelectionPlaying = false
let player, timeupdater, videotime = 0;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtubeVideo', {
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data != YT.PlayerState.PLAYING)
    return

  function updateTime() {
    var oldTime = videotime;
    if (player && player.getCurrentTime) {
      videotime = player.getCurrentTime();
    }
    if (videotime !== oldTime) {
      const reachStopTime = player.getCurrentTime() >= getOutSeconds()
      if (isSelectionPlaying && reachStopTime) {
        player.pauseVideo()
        isSelectionPlaying = false
      }
    }
  }
  timeupdater = setInterval(updateTime, 100);
}

const clampNumber = (value, min, max) => {
  const normalized = Number(value)
  if (Number.isNaN(normalized)) {
    return min
  }
  return Math.min(Math.max(normalized, min), max)
}

const getTimeSeconds = (hoursInput, minutesInput, secondsInput) => {
  const hours = clampNumber(hoursInput.value, 0, 99)
  const minutes = clampNumber(minutesInput.value, 0, 59)
  const seconds = clampNumber(secondsInput.value, 0, 59)

  hoursInput.value = hours
  minutesInput.value = minutes
  secondsInput.value = seconds

  return (hours * 3600) + (minutes * 60) + seconds
}

const getInSeconds = () => getTimeSeconds(inputInHours, inputInMinutes, inputInSeconds)
const getOutSeconds = () => getTimeSeconds(inputOutHours, inputOutMinutes, inputOutSeconds)

const getVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11)
    ? match[2]
    : url; // Fallback to assuming input is ID if regex doesn't match
}

const loadYoutubeVideo = () => {
  if (inputVideo.value === '') {
    alert('Please enter a YouTube URL or ID')
    return
  }

  const videoId = getVideoId(inputVideo.value)
  player.loadVideoById(videoId)
}

const playSelection = () => {
  isSelectionPlaying = true
  player.seekTo(getInSeconds())
  player.playVideo()
}

const downloadSelection = () => {
  message.style.color = 'orange'
  message.innerText = 'start converting video'

  fetch('http://localhost:3000/download', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputIn: getInSeconds(),
      inputOut: getOutSeconds(),
      inputVideo: player.getVideoUrl(),
      filename: inputFilename.value.trim()
    })
  })
    .then(response => response.json())
    .then(json => {
      if (json.includes('.mp4')) {
        message.style.color = 'greenyellow'
        message.innerText = 'Success!'
        youtubeVideo.src = json
        youtubeVideo.autoplay = true
        return
      }

      message.style.color = 'orangered'
      message.innerText = result
    }).catch(error => {
      message.style.color = 'orangered'
      message.innerText = 'Download error!'
    })
}

// Actions
loadVideo.onclick = () =>
  loadYoutubeVideo()
btnPlaySelection.onclick = () =>
  playSelection()
btnDownloadSelection.onclick = () =>
  downloadSelection()

const timeInputs = [
  inputInHours,
  inputInMinutes,
  inputInSeconds,
  inputOutHours,
  inputOutMinutes,
  inputOutSeconds
]

timeInputs.forEach((input) => {
  input.addEventListener('focus', () => input.select())
})
