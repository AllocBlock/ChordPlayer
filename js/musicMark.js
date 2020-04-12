/* 占位符库 */
String.prototype.format = function() {
    if(arguments.length == 0) return this;
    var param = arguments[0];
    var s = this;
    if(typeof(param) == 'object') {
        for(var key in param)
        s = s.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
        return s;
    } else {
        for(var i = 0; i < arguments.length; i++)
        s = s.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
        return s;
    }
}

var chord_audio = [];
var timeoutId = [];
var key_map = {
	"C" : 0,
    "#C" : 0,
	"D" : 1,
	"E" : 2,
	"F" : 3,
	"G" : 4,
	"A" : 5,
	"B" : 6,
};

var chord_list = {
	"C" : [3, 0, 0, 0],
    "Dm" : [0, 1, 2, 2],
    "Em" : [2, 3, 4, 0],
	"F" : [0, 1, 0, 2],
    "G" : [2, 3, 2, 0],
    "Am" : [0, 0, 0, 2],
    "E7" : [2, 0, 2, 1],
    "Csus4" : [3, 1, 0, 0],
    "Gsus4" : [2, 3, 3, 0],

    "G" : [2, 3, 2, 0],
    "Am" : [0, 0, 0, 2],
    "Bm" : [2, 2, 2, 4],
    "C" : [3, 0, 0, 0],
    "D" : [0, 2, 2, 2],
    "Em" : [2, 3, 4, 0],
    "B7" : [2, 2, 3, 2],
    "Gsus4" : [2, 3, 3, 0],
    "Dsus4" : [0, 3, 2, 2],

    "F" : [0, 1, 0, 2],
    "Gm" : [1, 3, 2, 0],
    "Am" : [0, 0, 0, 2],
    "bB" : [1, 1, 2, 3],
    "C" : [3, 0, 0, 0],
    "Dm" : [0, 1, 2, 2],
    "A7" : [0, 0, 1, 0],
    "Fsus4" : [0, 3, 1, 2],
    "Csus4" : [3, 1, 0, 0],

    "A" : [0, 0, 1, 2],
    "B" : [2, 2, 3, 4],
    "C7" : [1, 0, 0, 0],
    "D7" : [3, 2, 2, 2],
    "Cm" : [1, 1, 1, 3],
    "E" : [2, 4, 4, 4],
    "F7" : [3, 1, 3, 2],
    "Fm" : [3, 1, 0, 1],
    "G7" : [2, 1, 2, 0],
    "bA" : [3, 4, 3, 1],
};

var chord_group = {
    "C大调" : ["C", "Dm", "Em", "F", "G", "Am", "E7", "Csus4", "Gsus4"],
    "G大调" : ["G", "Am", "Bm", "C", "D", "Em", "B7", "Gsus4", "Dsus4"],
    "F大调" : ["F", "Gm", "Am", "bB", "C", "Dm", "A7", "Fsus4", "Csus4"],
};



var arpeggioTime = 0.2;
var arpeggioDown = true;
var volume = 1.0;
var musicVolume = 1.0;

var music = null;

var currentScale = 1.0;

$(function(){ // 初始化
	// 音量初始值
	volume = $("#slider-volume").val();

	// 琶音时间初始值
	arpeggioTime = $("#slider-arpeggio-time").val();

    // 滑动条的初始化
    updateSliderArpeggioTime($("#slider-arpeggio-time").get(0));
    updateSliderVolume($("#slider-volume").get(0));

    // 加载音频
    loadAudio();

    // 初始化和弦列表
    initChord();

    // 美化和弦列表滚动条
    $("#chord-table").niceScroll({
        cursorcolor: "#fff",//#CC0071 光标颜色
        cursoropacitymax: 0.8, //改变不透明度非常光标处于活动状态（scrollabar“可见”状态），范围从1到0
        touchbehavior: false, //使光标拖动滚动像在台式电脑触摸设备
        cursorwidth: "5px", //像素光标的宽度
        cursorborder: "0", // 游标边框css定义
        cursorborderradius: "5px",//以像素为光标边界半径
        autohidemode: true //是否隐藏滚动条
    });

    // 进度条的滚动条
    $("#music-slider-zone").niceScroll({
        cursorcolor: "#fff",//#CC0071 光标颜色
        cursoropacitymax: 0.8, //改变不透明度非常光标处于活动状态（scrollabar“可见”状态），范围从1到0
        touchbehavior: false, //使光标拖动滚动像在台式电脑触摸设备
        cursorwidth: "10px", //像素光标的宽度
        cursorborder: "0", // 游标边框css定义
        cursorborderradius: "10px",//以像素为光标边界半径
        autohidemode: true //是否隐藏滚动条
    });

    // 播放进度条，滚轮缩放
    $('#music-slider-zone').scrollLeft(100); // 移动滚动条到中间
    $("#music-slider-zone").on('mousewheel DOMMouseScroll', function(event, delta) {
        if (music != null && event.ctrlKey){
            //console.log(event);
            var normalWidth = $("#part-music").width();
            currentScale += delta/50;
            currentScale = Math.max(0.2, Math.min(20, currentScale));
            //console.log("更新缩放", currentScale, currentScale * normalWidth);
            $("#music-slider-zone-scale").css("width", currentScale * normalWidth);

            // 更新滚动条！
            // 进度条的滚动条
            $("#music-slider-zone").getNiceScroll().resize();
        }
        event.preventDefault(); // 接管
            return false;
    });
});

function loadAudio(){
    var audioDir = "resources/uku/";
    for (var i = 1; i <= 4; i++){
        chord_audio[i] = [];
        timeoutId[i] = []; // 初始化timeout列表，用于停止
        for (var j = 0; j < 16; j++){
            var audioFileIndex = fretToIndex(i, j);
            var audioFile = audioDir + (audioFileIndex+1).toString().padStart(2, '0') + '.mp3';
            var audio = new Audio();
            audio.src = audioFile;
            audio.onloadeddata = audioLoadedCallback; // 加载完成的回调
            audio.load();
            chord_audio[i][j] = audio;
        }
    }
}

var hasLoadedCount = 0; // 已加载的音频数量
var espectLoadedCount = 4 * 16; // 预计加载的音频数量
function audioLoadedCallback(){
    hasLoadedCount++;
    if (hasLoadedCount == espectLoadedCount){
        console.log("加载完成");
        $("#loading").text("加载完成！");
        $("#loading").animate({opacity: 0}, 1000, "swing", function(){
            $("#loading").hide();
        });
    }
}

/* 初始化和弦列表 */
function initChord(){
    var $chordTable = $("#chord-table");
    for (groupName in chord_group){
        // 标题
        $title = $("<div class=\"chord-group flex-center\">{0}</div>".format(groupName));
        $chordTable.append($title);
        for(chordName of chord_group[groupName]){
            // 检查是否有该和弦
            if (chord_list.hasOwnProperty(chordName)){
                var $newChord = $("<li class=\"chord-block flex-center\" onclick=\"playChordClick(this, \'{0}\')\">{0}</li>".format(chordName));
                $newChord.css("opacity", "0.0");
                $newChord.attr("draggable", "true"); // 可拖动
                $newChord.attr("ondragstart", "dragStart(event)"); // 拖动开始事件
                $newChord.attr("ondragend", "dragEnd(event)"); // 拖动结束事件
                $chordTable.append($newChord);
                $newChord.animate({opacity: 1.0}, 300, function(){
                    $newChord.removeAttr("style"); // 关闭和弦按钮渐变动画
                });
            }
            else{
                alert("未找到和弦" + chordName);
            }
        }
    }
    
}

var isDragging = false; // 判断是否在拖拽
var draggingChrodName = "";
/* 拖拽开始事件 */
function dragStart(e){
    //console.log("开始拖拽", e);
    isDragging = true;
    draggingChrodName = $(e.srcElement).text();
   
    // 特效
    if (music != null){
        $("#mark").stop(true, true).animate({"background-color": "#aaf"}, 100);
    }
}

function dragEnd(e){
    //console.log("拖拽结束");
    // 特效
    if (music != null){
        $("#mark").stop(true, true).animate({"background-color": "#55a"}, 100);
    }
}

function dragDrop(e){
    if (music != null){
        console.log("放置标记" + draggingChrodName);
        addMark(draggingChrodName, $("#slider-music").val());
    }
    else{
        showToast("请先加载音乐！");
    }
}

function allowDrop(e){
    e.preventDefault();
}


function addMark(chordName, timeTick){
    var $markTable = $("#music-mark-table");

    var $mark = $("<div class=\"music-mark flex-center\">{0}</div>".format(chordName));

    // 放置标记
    var musicLen = music.duration;
    $markTable.append($mark); // 先添加，否则不会渲染

    
    //var markHieght = $mark.innerHeight();
    var $scaler = $("#music-slider-zone-scale");
    var barWidth = $scaler.width();
    
    // 需要考虑滑块的宽度，以及容器的padding
    
    var thumbWidth = 18;
    var scale = (barWidth - thumbWidth) / barWidth;
    //var base = $scaler.width() * (timeTick/musicLen) * scale;

    var markWidth = $mark.innerWidth();

    var padding = ($scaler.innerWidth() - $scaler.width()) / 2;
    console.log(padding);
    //var left = base - markWidth/2 + thumbWidth/2 + padding;
    var left = "calc({0}% - p" // todo
    var top = 10;

    $mark.css("left", left);
    $mark.css("top", top);

    
}



/* 播放音调 */
function playKey(string, fret){
	var audio = chord_audio[string][fret];
	var $audio = $(chord_audio[string][fret]); //jQuery对象 
	$audio.stop(true, true).animate({volume: 0}, 20, "linear", function(){ // 快速淡出，否则立刻停止会导致咔哒声
		console.log(string + "弦 " + fret + "品");
		audio.currentTime = 0;
		audio.volume = volume;
		audio.play();
	});
}

/* 事件：品位转索引 */
function fretToIndex(string, fret){
    var base;
    switch(string){
        case 1: {
            base = 9;
            break;
        }
        case 2: {
            base = 4;
            break;
        }
        case 3: {
            base = 0;
            break;
        }
        case 4: {
            base = 7;
            break;
        }
        default:{
            return -1;
        }
    }
    return base + fret;
}

/* 播放和弦 */
function playChord(chordName){
    // 检查和弦是否存在，然后播放
	if (chord_list.hasOwnProperty(chordName)){
		console.log(chordName);
		var frets = chord_list[chordName];
		for (var i = 1; i <= 4; i++){

			if (arpeggioDown){ // 向下琶音
				var string = 5 - i;
				var fret = frets[4-i];
			}
			else{ // 向上琶音
				var string = i;
				var fret = frets[i-1];
			}
			if (timeoutId[string][fret]) clearTimeout(timeoutId[string][fret]);
			timeoutId[string][fret] = setTimeout(playKey, arpeggioTime / 3 * (i-1) * 1000, string, fret);
		}
		
	}
	else{
		throw ('未找到和弦：' + chordName);
	}
}



/* 显示气泡提示 */
function showToast(text, duration = 1.0){
    var $toast = $("#toast");
    $toast.stop(true, true);
    $toast.text(text);
    $toast.css("opacity", "0");
    $toast.css("display", "flex");
    $toast.animate({opacity: 1}, 50);
    $toast.animate({"null":1}, duration*1000); // 无意义动画，避免使用delay无法取消的问题
    $toast.animate({opacity: 0}, 300);
}

/* 绘制和弦图片 */
function drawChordPic(chordName){
    var width = 300, height = 500;

    var canvas = document.getElementById('chord-pic');

    // 隐藏特效
    //$(canvas).stop(true, true).animate({opacity: 0}, 1000);

    var pen = canvas.getContext('2d');

    pen.clearRect(0, 0, width, height);

    var left = 50, right = width - 50, top = 100, bottom = height - 50;
    var stringCount = 4;
    var fretCount = 3;

    // 绘制和弦名称
    pen.font = "50px 微软雅黑";
    pen.textAlign  = "center";
    pen.fillText(chordName, width/2, top - 20);

    // 绘制线
    pen.beginPath();
    var stringInterval = (right - left) / (stringCount - 1);
    for(var i = 0; i < stringCount; i++){
        pen.moveTo(left + i*stringInterval, top);
        pen.lineTo(left + i*stringInterval, bottom);
        pen.stroke();
    }

    var fretInterval = (bottom - top) / fretCount;
    for(var i = 0; i <= fretCount; i++){
        pen.moveTo(left, top + i*fretInterval);
        pen.lineTo(right, top + i*fretInterval);
        pen.stroke();
    }
    pen.closePath();

    // 绘制品位起始
    var frets = chord_list[chordName];
    var fretStart = 0; // 等于非零的最小数
    var fretEnd = Math.max.apply(null, frets);
    for(var i = 0; i < stringCount; i++){
        if (frets[i] != 0 && fretStart == 0){ // 第一个不是0的数
            fretStart = frets[i];
        }
        else if (frets[i] < fretStart && frets[i] != 0){ // 比现在小的非零的数
            fretStart = frets[i];
        }
    }

    if (fretEnd <= fretCount) fretStart = 0; // 如果最高品位都在范围内，那么优先没有品位偏移量

    if (fretStart > 0){
        pen.font = "40px 微软雅黑";
        pen.fillText(fretStart, left - 30, top + fretInterval / 2 - 10);
    }

    // 绘制品位标记
    
    function drawCircle(pen, x, y, r){
        pen.beginPath();
        pen.arc(x, y, r, 0, 2*Math.PI);
        pen.fill(); //确认填充
        pen.closePath();
    }

    var radius = 30;
    for(var i = 0; i < stringCount; i++){
        var fretOffset = fretStart == 0 ? frets[i] - 1 : frets[i] - fretStart;
        if (frets[i] == 0) continue;
        else if (fretOffset > fretCount){
            console.log("和弦{0}的第{1}弦为第{2}品，超出了范围".format(chordName, i+1, frets[i]));
            continue;
        }
        var posX = right - i * stringInterval; // 从右到左
        var posY = top + fretInterval/2 + fretOffset * fretInterval; // 从上到下
        drawCircle(pen, posX, posY, radius);
    }

    // 显示特效
    //$(canvas).stop(true, true).animate({opacity: 1}, 500);
}

/* 按钮事件：播放和弦 */
function playChordClick(button, chordName){
    // 特效
    // 进度条动画
    var $progressBar = $("<div class=\"chord-block-progress-bar\"></div>");

    $(button).children("div").remove();
    $(button).append($progressBar);
    var buttonWidth = $(button).innerWidth();
    $progressBar.css("left", "-{0}px".format(buttonWidth));
    $progressBar.animate({left: "0px"}, arpeggioTime * 1000, function(){
        $progressBar.animate({opacity: 0}, 400, function(){
            $progressBar.remove();
        });
    });

    // 播放和弦
    playChord(chordName);
    
    // 绘制和弦
    drawChordPic(chordName);
}

/* 显示音乐播放器加载提示 */
function showMusicCover(){
    $("#music-hint-cover").show();
}

/* 隐藏音乐播放器加载提示 */
function hideMusicCover(){
    $("#music-hint-cover").hide();
}

/* 秒数转时间 */
function secondToTick(second){
    second = Math.floor(second); // 取整
    var minute = Math.floor(second / 60); // 计算分钟
    second = second - minute * 60; // 计算秒数
    return "{0}:{1}".format((minute).toString().padStart(2, '0'), (second).toString().padStart(2, '0'));
}


/* 加载音乐 */
function loadMusic(){
    $fileInput = $("<input type=\"file\">");
    $fileInput.click();
    $fileInput.change(function(e){
        //console.log(e);
        var file = e.currentTarget.files[0];
        music = new Audio();
        // 加载音频
        var reader = new FileReader();
        reader.onload = function (e) {
            music.src = e.target.result;
            music.volume = 0;
            music.onloadeddata = function(){
                hideMusicCover();
                //console.log(music.duration);
                showToast("音乐加载完成！");
                // 设置进度条
                $("#slider-music").attr("max", music.duration);
                $("#slider-length").text(secondToTick(music.duration));
                // 更新歌曲名
                var fileName = $fileInput.val().split('/').pop().split('\\').pop().split('\\\\').pop();
                //console.log("filename", fileName);
                $("#music-name").text(fileName);
            }
            music.onended = function(){ // 结束后回到起点
                var cTime = 0;
                // 设置时间
                music.currentTime = cTime;
                // 更新进度条
                $("#slider-tick").text(secondToTick(cTime));
                $("#slider-music").val(cTime);
                $("#slider-music").css('background', bgRaw.format(sliderFrontColor, (cTime/music.duration)*100));
            }
            music.load();

            
            
        }
        reader.readAsDataURL(file);
        // music.onloadeddata = musicLoadedCallback; // 加载完成的回调
        // music.load();

    })
}

function resumeMusic(){
    if (music === null){
        showToast("请先加载音乐！");
        return false;
    }
    $(music).stop(false, true); // 结束当前动画
    
    music.play();
    $(music).animate({volume: musicVolume}, 50, "linear");
    
    return true;
}

function restartMusic(){
    music.currentTime = 0;
    resumeMusic();
    return true;
}

function pauseMusic(){
    if (music === null){
        showToast("请先加载音乐！");
        return false;
    }
    $(music).stop(false, true).animate({volume: 0}, 200, "linear", function(){ // 快速淡出，否则立刻停止会导致咔哒声
        music.pause();
    });
    
    return true;
}

function stopMusic(){
    pauseMusic();
    music.currentTime = 0;
    return true;
}

/* 按钮事件：加载音乐 */
function loadMusicClick(){
    loadMusic();
}

/* 更新事件：琶音时长滑动条 */
var sliderFrontColor = "#059CFA";
var bgRaw = 'linear-gradient(to right, {0}, {0} {1}%, white {1}%, white)';
function updateSliderArpeggioTime(slider){
    $(slider).css('background', bgRaw.format(sliderFrontColor, slider.value*100));
    $("#text-arpeggio-time").text("- 琶音时长 {0}s -".format(slider.value));
	arpeggioTime = slider.value;
}
/* 更新事件：音量滑动条 */
function updateSliderVolume(slider){
    $(slider).css('background', bgRaw.format(sliderFrontColor, slider.value*100));
    $("#text-volume").text("- 音量 {0}% -".format(parseInt(slider.value*100)));
	volume = slider.value;
}

var isMusicSliderMoving = false;
var isPlayBeforeMoving = false;

/* 更新事件：音乐进度条 */
function updateMusicSlider(slider){
    if (!isMusicSliderMoving){ // 刚开始拖拽时停止音乐
        isMusicSliderMoving = true;
        isPlayBeforeMoving = !music.paused;
        pauseMusic();
    }
    var cTime = slider.value;
    // 更新进度条
    $("#slider-tick").text(secondToTick(cTime));
    $("#slider-music").css('background', bgRaw.format(sliderFrontColor, (cTime/music.duration)*100));
    
}
/* 更新事件：音乐进度条 */
function doneMusicSlider(slider){
    isMusicSliderMoving = false;
    if (isPlayBeforeMoving){
        resumeMusic();
    }
    var cTime = slider.value;
    // 更新音乐
    music.currentTime = cTime;
}
/* 轮询：根据歌曲进度更新进度条 */

function updateMusicSliderAuto(){
    if (music != null && !music.paused && !isMusicSliderMoving){ // 音乐已加载，正在播放且没有拖拽进度条
        //console.log("音乐更新进度条");
        var cTime = music.currentTime;
        // 更新进度条
        $("#slider-music").val(cTime);
        $("#slider-music").css('background', bgRaw.format(sliderFrontColor, (cTime/music.duration)*100));
        // 更新文本
        $("#slider-tick").text(secondToTick(cTime));
    }
}

setInterval(updateMusicSliderAuto, 200);