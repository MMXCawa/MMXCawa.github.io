let currentImage = 1;
const totalImages = 8;
let nextImage = 2;
let isTransitioning = false;

// 预加载所有图片
function preloadImages() {
    for (let i = 1; i <= totalImages; i++) {
        const img = new Image();
        img.src = `http://MMXCawa.github.io/images/${i}.jpg`;
    }
}

// 初始化背景层
function initBackgroundLayers() {
    const bg1 = document.createElement('div');
    const bg2 = document.createElement('div');
    
    bg1.id = 'bg1';
    bg2.id = 'bg2';
    
    Object.assign(bg1.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -2,
        opacity: 1,
        transition: 'opacity 1s ease-in-out',
        backgroundImage: `url('http://MMXCawa.github.io/images/1.jpg')`
    });
    
    Object.assign(bg2.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1,
        opacity: 0,
        transition: 'opacity 1s ease-in-out',
        backgroundImage: `url('http://MMXCawa.github.io/images/2.jpg')`
    });
    
    document.body.appendChild(bg1);
    document.body.appendChild(bg2);
}

function changeBackground() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    const bg1 = document.getElementById('bg1');
    const bg2 = document.getElementById('bg2');
    
    // 淡出当前图片30%
    bg1.style.opacity = 0.7;
    
    setTimeout(() => {
        // 设置下一张图片
        const nextImg = (currentImage % totalImages) + 1;
        bg2.style.backgroundImage = `url('http://MMXCawa.github.io/images/${nextImg}.jpg')`;
        bg2.style.opacity = 1;
        
        setTimeout(() => {
            // 完全淡出当前图片
            bg1.style.opacity = 0;
            
            setTimeout(() => {
                // 交换层的位置和图片
                bg1.style.backgroundImage = bg2.style.backgroundImage;
                bg1.style.opacity = 1;
                bg2.style.opacity = 0;
                
                currentImage = nextImg;
                isTransitioning = false;
            }, 500);
        }, 500);
    }, 500);
}

// 初始化
preloadImages();
initBackgroundLayers();
setInterval(changeBackground, 5000);