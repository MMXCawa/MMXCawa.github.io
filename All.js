let currentImage = 1;
const totalImages = 8;
function changeBackground() {
currentImage = (currentImage % totalImages) + 1;
document.body.style.backgroundImage = `url('http://MMXCawa.github.io/images/${currentImage}.jpg')`;
document.body.classList.add('fade');
setTimeout(() => {
document.body.classList.remove('fade');
}, 1000);
}

setInterval(changeBackground, 2000);