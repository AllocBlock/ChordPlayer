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


var musicVolume = 1.0;
var music = null;
var isMusicLoaded = false;
var currentScale = 1.0;
var musicDuration = null;
var isMusicSliderMoving = false;
var isPlayBeforeMoving = false;

var isMarkContextShow = false;

// 性能相关参数
var musicSliderUpdateTime = 10; // 音乐进度条的刷新间隔，单位毫秒，比较吃CPU

$(function(){ // 初始化
    // 键盘事件
    $(document).keydown(function(e){
        if (isMarkContextShow){ // 打开编辑菜单时屏蔽按键
            return;
        }
        switch(e.which){
            case 32: { // 空格
                if (music != null){ 
                    if (music.paused){
                        resumeMusic();
                    }
                    else{
                        pauseMusic();
                    }
                }
                break;
            }
            case 81: { // Q键
                prevMark();
                break;
            }
            case 69: { // E键
                nextMark();
                break;
            }
            case 87: { // W键
                addMark();
                break;
            }
        }
    });

    // 禁止切换按钮的键盘事件快捷键
    $("input[type=checkbox]").keydown(function(e){
        e.preventDefault();
    });
	// 音量初始值
	musicVolume = $("#slider-music-volume").val();

    // 美化进度条的滚动条
    $("#music-slider-zone").niceScroll({
        cursorcolor: "#ffddd3",// 颜色
        cursoropacitymax: 0.8, // 透明度
        cursorwidth: "10px", // 宽度
        cursorborder: "0", // 边框
        cursorborderradius: "10px",// 圆角
        autohidemode: true // 自动隐藏滚动条
    });

    // 播放进度条，滚轮缩放事件
    $('#music-slider-zone').scrollLeft(100); // 移动滚动条到中间
    $("#music-slider-zone").on('mousewheel DOMMouseScroll', function(event, delta) {
        if (isMusicLoaded && event.ctrlKey){
            //console.log(event);
            var normalWidth = $("#part-music").width();
            var newScale = currentScale *(1 + delta/20);
            newScale = Math.max(1, Math.min(musicDuration / 10, newScale));

            $("#music-slider-zone-scale").css("width", newScale * normalWidth);

            // 更新滚动条！
            // 进度条的滚动条
            var $sliderZone = $("#music-slider-zone");
            $sliderZone.getNiceScroll().resize();
            // 以鼠标位置为中心缩放..
            var marginLeft = parseInt($("#music-slider-zone").css("margin-left").replace("px", ""));
            var padding = 100;
            var cursorX = event.pageX - marginLeft; // 要减去margin

            var newLeft = (-padding + $sliderZone.scrollLeft() + cursorX) / currentScale * newScale - cursorX + padding;
            $sliderZone.scrollLeft(newLeft);
            currentScale = newScale;

        }
        event.preventDefault(); // 接管
        return false;
    });

    // 播放进度条，双击事件
    $("#music-slider-zone").dblclick(function() {
        // 双击播放
        if (isMusicLoaded && music.paused){
            resumeMusic();
        }
        event.preventDefault(); // 接管
        return false;
    });

    // 标签右键菜单事件
    $contextMenu = $("#mark-context");

    // 标签输入框失去焦点
    $("#mark-context-name").blur(function(){ // 失去焦点则隐藏菜单
        hideMarkContext();
    });

    // 标签输入框键盘
    $("#mark-context-name").keydown(function(e){
        switch(e.which){
            case 13: { // 回车
                $("#mark-context-name")[0].blur(); // 输入完成，自动失去焦点
                break;
            }
        }
    });

    // :)
    console.log("哈喽！aloha~");
});


/* 添加标记 */
function addMark(text = "标记", timeTick = null, overwrite = true){
    if (music == null){
        showToast("请先加载音乐！");
        return;
    }

    // 默认放置到当前位置
    if (timeTick == null) timeTick = music.currentTime; 
    else timeTick = parseFloat(timeTick);

    // 覆盖模式下，如果该位置已经有标记，则覆盖掉
    if (overwrite){
        $(".music-mark").each(function(){
            if ($(this).attr("data-tick") == timeTick){ 
                $(this).remove();
            }
        })
    }
    

    var $markTable = $("#music-mark-table");

    var $mark = $("<div class=\"music-mark\"></div>");
    var $markName = $("<div class=\"music-mark-name flex-center\">{0}</div>".format(text));
    var $markPin = $("<div class=\"music-mark-pin\"></div>");
    $mark.append($markName);
    $mark.append($markPin);
    // 绑定事件
    $mark.contextmenu(markContextClick);
    $mark.mousedown(markMouseDown);

    // 放置标记
    $markTable.append($mark); // 先添加，否则不会渲染，也就不知道元素宽度

    var left = getMarkLeftByTick($mark[0], timeTick);
    var top = 0;

    $mark.css("left", left);
    $mark.css("top", top);

    // 附加信息
    $mark.attr("data-tick", timeTick.toFixed(5)); // 标记所处的时间, toFixed解决精度问题！

    // 特效
    $mark.hide();
    $mark.fadeIn(150);

    // 返回标记
    return $mark;
}

/* 删除标记 */
function deleteMark($mark){
    $mark.css("pointer-events", "none"); // 先关闭按键响应
    $mark.fadeOut(200, function(){
        $mark.remove();
    })
}

/* 删除所有标记 */
function deleteAllMark(){
    if (confirm("删除所有标记？")){
        deleteMark($(".music-mark"));
    }
}

/* 上一个标记 */
function prevMark(){
    if (isMusicLoaded){
        var $targetMark = null;
        var cTime = music.currentTime.toFixed(5);
        $(".music-mark").each(function(){
            //console.log(cTime, $(this).attr("data-tick"), $targetMark == null?"":$targetMark.attr("data-tick"));
            var cDataTick = parseFloat($(this).attr("data-tick"));
            var tDataTick = $targetMark == null ? null : parseFloat($targetMark.attr("data-tick"));
            if (cDataTick < cTime){
                if ($targetMark == null || cDataTick > tDataTick){
                    $targetMark = $(this);
                }
            }
        })
        if ($targetMark == null){
            keepTickInSight(0);
            moveToTick(0);
        }
        else{
            keepTickInSight($targetMark.attr("data-tick"));
            moveToTick($targetMark.attr("data-tick"));
        }
    }
}
/* 下一个标记 */
function nextMark(){
    if (isMusicLoaded){
        var $targetMark = null;
        var cTime = music.currentTime.toFixed(5);
        $(".music-mark").each(function(){
            //console.log(cTime, $(this).attr("data-tick"), $targetMark == null?"":$targetMark.attr("data-tick"));
            var cDataTick = parseFloat($(this).attr("data-tick"));
            var tDataTick = $targetMark == null ? null : parseFloat($targetMark.attr("data-tick"));
            if (cDataTick > cTime){
                if ($targetMark == null || cDataTick < tDataTick){
                    $targetMark = $(this);
                }
            }
        })
        if ($targetMark != null){
            keepTickInSight($targetMark.attr("data-tick"));
            moveToTick($targetMark.attr("data-tick"));
        }
    }
}

/* 事件：移动到标记 */
function markLocateClick(){
    if ($currentMark != null){
        var cTime = $currentMark.attr("data-tick");
        music.currentTime = cTime;
        $("#slider-music").val(cTime);
        $("#slider-tick").text(tickToText(cTime));
    }
}
/* 事件：删除标记 */
function markDeleteClick(){
    deleteMark($currentMark);
    $currentMark = null;
}

var isMarkDragging = false;
var isCopyingMark = false;
var $markDrag = null;
/* 事件：鼠标按下标记 */
function markMouseDown(e){
    //console.log("鼠标左键按下标记");
    if (e.which == 1){ // 左键按下
        isMarkDragging = true;
        if (e.ctrlKey){ // 复制模式
            //showToast("复制");
            isCopyingMark = true;
            $markDrag = addMark($(this).text(), $(this).attr("data-tick"), false);
        }
        else{
            $markDrag = $(this);
        }
    }
}
/* 事件：鼠标松开 */
$(document).mouseup(mouseUp);
function mouseUp(e){
    if (isMarkDragging && e.which == 1){ // 左键松开
        //console.log("鼠标左键松开");
        if (isCopyingMark){ // 复制模式
            // 检查有无重叠，覆盖重叠的（主要是针对点一下又松开的情况？
            $(".music-mark").each(function(){
                if ($(this)[0] != $markDrag[0] && $(this).attr("data-tick") == $markDrag.attr("data-tick")){ 
                    $(this).remove();
                }
            })
            isCopyingMark = false;
        }
        isMarkDragging = false;
        $markDrag = null;
        
    }
}
/* 事件：鼠标移动 */
$(document).mousemove(mouseMove);
function mouseMove(e){
    if (isMarkDragging){ // 有正在拖拽的标记
        //console.log("鼠标拖拽");
        var tick = getTickByCursor(e.pageX);
        var left = getMarkLeftByTick($markDrag[0], tick);

        $markDrag.css("left", left);
        $markDrag.attr("data-tick", tick.toFixed(5)); // 标记所处的时间
    }
}
var $currentMark = null;
/* 事件：标记上右键 */
function markContextClick(e){
    //console.log("点击了右键");
    e.preventDefault(); // 禁止默认右键菜单

    $currentMark = $(this);
    
    // 设置右键菜单
    $contextMenu = $("#mark-context");
    $contextMenuName = $("#mark-context-name");
    $contextMenuName.val($currentMark.text());
    // 移动右键菜单
    // var left = $(this).offset().left - $(this).width()/2;
    // var top = $(this).offset().top - $contextMenu.height()/2 - 20;
    var left = $currentMark.offset().left + $currentMark.innerWidth()/2 - $contextMenu.width()/2;
    left = Math.max(0, Math.min($(document).width() - $contextMenu.width(), left)); // 防止超出屏幕
    var top = $currentMark.offset().top - $contextMenu.height() - 20;
    $contextMenu.css("left", left);
    $contextMenu.css("top", top);
    // 显示右键菜单
    isMarkContextShow = true;
    $contextMenu.stop(true, true).show().animate({opacity: 1}, 200); 
    // 文本框获取焦点
    $contextMenuName[0].focus();
}
/* 更新事件：更新编辑框 */
function updateMarkName(input){
    if ($currentMark == null) return;
    $currentMark.children(".music-mark-name").text($(input).val());
    var tick = $currentMark.attr("data-tick"); // 使用data-tick, 可能有误差...
    $currentMark.css("left", getMarkLeftByTick($currentMark[0], tick)); 
}
/* 隐藏右键菜单 */
function hideMarkContext(){
    isMarkContextShow = false;
    $contextMenu.stop(true, true).animate({opacity: 0}, 300, function(){
        $contextMenu.hide();
    });
}


/* 由鼠标位置计算对应的刻度 */
function getTickByCursor(x){
    if (isMusicLoaded){

        var marginLeft = parseInt($("#music-slider-zone").css("margin-left").replace("px", ""));
        var padding = 100;
        x = x - marginLeft; // 要减去margin
        var leftInSlider = $("#music-slider-zone").scrollLeft() + x - padding;
        var barWidth = $("#music-slider-zone-scale").width(); // 父物体长度

        var tick = (leftInSlider / barWidth) * musicDuration;
        tick = Math.max(0, Math.min(musicDuration, tick)); // 范围限制
        return tick;
    }
    return -1;
}

/* 由tick计算mark的left */
function getMarkLeftByTick(mark, tick){
    var $mark = $(mark);
    if (isMusicLoaded){
        var markWidth = $mark.innerWidth();
        var percentage = (tick / musicDuration) * 100;
        percentage = Math.max(0, Math.min(100, percentage)); // 限制范围
        var offset = markWidth/2;
        var left = "calc({0}% - {1}px".format(percentage, offset);
        return left;
    }
    return -1;
}

/* 保证视野内可以看见tick的位置 */
function keepTickInSight(tick, follow = "none"){
    var sightWidth = $("#music-slider-zone").width();
    var canvasWidth = $("#music-slider-zone-scale").width();
    var padding = 100;
    var cLeft = $("#music-slider-zone").scrollLeft();
    var maxScrollLeft = canvasWidth + 2 * padding - sightWidth;

    
    var tickPos = padding + tick / musicDuration * canvasWidth;
    switch(follow){
        case "none":{
            if (tickPos < cLeft + padding){ // 处于左侧区域，或左侧看不见的区域
                var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos - padding));
                $("#music-slider-zone").scrollLeft(newLeft);
            }
            else if (tickPos > cLeft + sightWidth - padding){ // 处于左侧区域，或左侧看不见的区域
                var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos + padding - sightWidth));
                $("#music-slider-zone").scrollLeft(newLeft);
            }
            break;
        }
        case "left":{
            var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos - padding));
            $("#music-slider-zone").scrollLeft(newLeft);
            break;
        }
        case "right":{
            var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos + padding - sightWidth));
            $("#music-slider-zone").scrollLeft(newLeft);
            break;
        }
        case "center":{
            var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos - sightWidth/2));
            $("#music-slider-zone").scrollLeft(newLeft);
            break;
        }
        case "inleft":{ // 保证在屏幕内，左侧半边，到右侧时则强制居中
            var newLeft = Math.max(0, Math.min(maxScrollLeft, tickPos - sightWidth/2));
            if (tickPos >= cLeft + sightWidth/2){ // 在屏幕右侧，则居中
                $("#music-slider-zone").scrollLeft(newLeft);
            }
            else if (tickPos < cLeft){ // 在看不见的左侧，放到最左
                $("#music-slider-zone").scrollLeft(Math.max(0, Math.min(maxScrollLeft, tickPos)));
            }
            
            break;
        }
        // case "switchpage":{
        //     break;
        // }
        default:{
            throw "keepTickInSight follow参数错误！";
            break;
        }
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
/* 显示音乐播放器加载提示 */
function showMusicCover(){
    $("#music-hint-cover").stop(true, true).show().animate({opacity: 1}, 500); // 主要是更改文件时
}
/* 隐藏音乐播放器加载提示 */
function hideMusicCover(){
    $("#music-hint-cover").css("pointer-events", "none"); // 暂时关闭事件
    $("#music-hint-cover").stop(true, true).animate({opacity: 0}, 500, function(){
        $("#music-hint-cover").hide();
        $("#music-hint-cover").text("点击加载音乐~");
        $("#music-hint-cover").removeClass("pointer-events"); // 暂时关闭事件
    }); // 主要是更改文件时
}

/* 秒数转时间 */
function tickToText(second){
    second = Math.floor(second); // 取整
    var minute = Math.floor(second / 60); // 计算分钟
    second = second - minute * 60; // 计算秒数
    return "{0}:{1}".format((minute).toString().padStart(2, '0'), (second).toString().padStart(2, '0'));
}
/* 库函数：base64(dataurl)转binary */
function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

var isMusicLoading = false;

/* 选择音乐加载 */
function selectMusic(){
    // 如果正在加载，则暂时禁止选择文件
    if (isMusicLoading){
        return;
    }
    // 打开文件选择框
    $fileInput = $("<input type=\"file\">");
    $fileInput.change(cbFileSelected);
    $fileInput.click();
    

    // 选择文件的回调
    function cbFileSelected(e){
        // 显示并改变文本
        $("#music-hint-cover").text("加载中...");
        showMusicCover();

        loadMusic(e.currentTarget.files[0]);
    }
}
/* 加载音乐 */
function loadMusic(file){
    if (file == null){
        showToast("打开文件失败！");
        return;
    }

    isMusicLoaded = false;
    isMusicLoading = true;
    // 如果已经打开，则销毁
    if (music != null){
        pauseMusic();
        music.src = "";
        $(music).remove();
    }

    // 显示并改变文本
    $("#music-hint-cover").text("加载中...");
    showMusicCover();
    
    // 加载文件
    var reader = new FileReader();
    reader.onload = cbReaderLoaded;
    reader.readAsDataURL(file);

    // 文件加载完成的回调
    function cbReaderLoaded(e) {
        music = new Audio();
        // 加载音频
        music.src = e.target.result;
        music.volume = 0;
        music.onloadeddata = cbMusicLoaded;
        music.ondurationchange = cbMusicDurationChange;
        music.onended = cbMusicEnded;
        music.load();
        
        // 绘制波形
        var base64 = e.target.result.replace(/.*base64,/, ""); // DataUrl转Base64
        drawWaveform($("#music-waveform")[0], _base64ToArrayBuffer(base64));
        
    }

    // 音乐加载后的回调
    function cbMusicLoaded(){
        // 更新歌曲名
        var fileName = file.name.match(/(.*)\.[^.]+/)[1];
        //console.log("filename", fileName);
        $("#music-name").text(fileName);
    }

    // 音乐时长变化的回调
    function cbMusicDurationChange(){
        // 不只会在加载完成后触发
        // 在设置currentTime时，有可能会导致duration变化，出现偏移，因此使用本函数解决
        musicDuration = music.duration;
        // 设置进度条
        $("#slider-music").attr("max", musicDuration);
        $("#slider-length").text(tickToText(musicDuration));
        moveToTick(0);
    }



    // 音乐播放完成的回调
    function cbMusicEnded(){
        pauseMusic();
        moveToTick(0);
    }
}

function moveToTick(tick){
    tick = Math.max(0, Math.min(musicDuration, tick));
    // 设置时间
    music.currentTime = tick;
    // 设置进度条和时间显示
    $("#slider-tick").text(tickToText(tick));
    $("#slider-music").val(tick);         
}

function drawWaveform(canvas, arrayBuffer) {
    // 使用audiocontext解码音频(ArrayBuffer转AudioBuffer)
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.decodeAudioData(arrayBuffer, cbAudioDecoded).catch(function (error) { 
        showToast("解码文件失败，请选择正确的音频文件！", 1.5);
        isMusicLoading = false;
        $("#music-hint-cover").text("点击加载音乐~");
    });

    // 音频解码完毕的回调
    function cbAudioDecoded(buffer){
        var pen = canvas.getContext("2d"); // 画笔
        // 关闭抗锯齿
        pen.webkitImageSmoothingEnabled = false;
        pen.mozImageSmoothingEnabled = false;
        pen.imageSmoothingEnabled = false;

        var data = buffer.getChannelData(0); // 第一轨的数据
        var dataLen = data.length; // 数据个数

        // 设置画布宽度
        $(canvas).attr("width", buffer.duration * 200);

        // 绘制参数
        var width = $(canvas).attr("width");
        var height = $(canvas).attr("height");
        var interval = 50; // 采样间隔
        var sampleCount = Math.floor(dataLen / interval); // 采样数
        var amp = height / 2; // 振幅是高度的一般（注意音频数据是有正负的,-1.0到1.0）

        // 开始绘制
        pen.clearRect(0, 0, width, height); // 清空画布
        pen.moveTo(0, amp); // 左侧中点开始

        for(var i = 0; i < sampleCount; i++){
            // 求区间平均值
            var avg = 0.0;
            for (var j = 0; j < interval; j++) {
                avg += data[(i * interval) + j];
            }
            avg /= interval;
            // 画线
            var left = (i * interval) / dataLen * width;
            var top = avg * amp + amp;
            pen.lineTo(left, top);
        }
        pen.strokeStyle = "#ffddd3";
        pen.stroke();  // 填充
        // 更新进度条
        updateSliderMusicVolume($("#slider-music-volume").get(0));
        updateSliderMusicSpeed($("#slider-music-speed").get(0));
        
        // 隐藏提示
        hideMusicCover();
        showToast("音乐加载完成！");
        isMusicLoaded = true; // 音乐加载完成
        isMusicLoading = false;
    }
    
}

function resumeMusic(){
    if (music === null){
        showToast("请先加载音乐！");
        return false;
    }
    isMusicSliderMoving = false; // 预防一些事件bug
    
    $(music).stop(false, true); // 结束当前动画
    
    music.play();
    if (!isMusicMuted){ // 是否静音
        $(music).animate({volume: musicVolume}, 50, "linear");
    }
    

    // 更改图标
    $("#music-play-icon").hide(); 
    $("#music-pause-icon").show(); 
    return true;
}

function restartMusic(){
    moveToTick(0);
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

    // 更改图标
    $("#music-play-icon").show(); 
    $("#music-pause-icon").hide(); 
    return true;
}

function stopMusic(){
    pauseMusic();
    music.currentTime = 0;
    return true;
}

function togglePlayMusic(){
    if (!isMusicLoaded){
        showToast("请先加载音乐！");
        return;
    }

    if (music.paused){
        resumeMusic();
    }
    else{
        pauseMusic();
    }
}

var isMusicMuted = false;
function toggleMuteMusic(){
    if (!isMusicLoaded){
        showToast("请先加载音乐！");
        return;
    }
    $(music).stop(false, true); // 停止音量相关的动画
    if (isMusicMuted){
        music.volume = musicVolume;
        // 更改图标
        $("#music-volume-icon").show(); 
        $("#music-mute-icon").hide(); 
        // 文字
        $("#music-volume-text").text(Math.round(musicVolume*100) + "%");
    }
    else{
        music.volume = 0;
        // 更改图标
        $("#music-volume-icon").hide(); 
        $("#music-mute-icon").show();
        $("#music-volume-text").text("静音");
    }
    isMusicMuted = !isMusicMuted;
}

var sliderFrontColor = "#ffddd3";
var bgRaw = 'linear-gradient(to right, {0}, {0} {1}%, white {1}%, white)';
/* 更新事件：音乐音量滑动条 */
function updateSliderMusicVolume(slider){
    if (!isMusicLoaded){
        showToast("请先加载音乐！");
        return;
    }
    $(slider).css('background', bgRaw.format(sliderFrontColor, slider.value*100));
    musicVolume = slider.value;
    if (!isMusicMuted){
        music.volume = slider.value;
        $("#music-volume-text").text(Math.round(slider.value*100) + "%");
    }

}
/* 更新事件：音乐速度滑动条 */
var speedList = {
    1: 0.5,
    2: 0.6,
    3: 0.7,
    4: 0.8,
    5: 0.9,
    6: 1.0,
    7: 1.2,
    8: 1.5,
    9: 2.0,
    10: 2.5
}
function updateSliderMusicSpeed(slider){
    if (!isMusicLoaded){
        showToast("请先加载音乐！");
        return;
    }
    $(slider).css('background', bgRaw.format(sliderFrontColor, (slider.value-1)/9*100));
    var musicSpeed = speedList[parseInt(slider.value)];
    music.playbackRate = musicSpeed;
    $("#music-speed-text").text("x" + musicSpeed.toFixed(1));
}
    function resetMusicSpeed(){
        if (!isMusicLoaded){
            showToast("请先加载音乐！");
            return;
        }
        $("#slider-music-speed").val(6);
        updateSliderMusicSpeed($("#slider-music-speed").get(0));
    }


/* 更新事件：音乐进度条移动 */
function updateMusicSlider(slider){
    if (!isMusicLoaded){
        showToast("请先加载音乐！");
        return;
    }
    if (!isMusicSliderMoving){ // 刚开始拖拽时停止音乐
        isMusicSliderMoving = true;
        isPlayBeforeMoving = !music.paused;
        pauseMusic();
    }
    var cTime = Math.max(0, Math.min(musicDuration, slider.value));
    // 更新进度条
    $("#slider-tick").text(tickToText(cTime));
    //$("#slider-music").css('background', bgRaw.format(sliderFrontColor, (cTime/musicDuration)*100));
}
/* 更新事件：音乐进度条松开 */
function doneMusicSlider(slider){
    isMusicSliderMoving = false;
    if (isPlayBeforeMoving){
        resumeMusic();
    }
    // 更新音乐
    var cTime = Math.max(0, Math.min(musicDuration, slider.value));
    moveToTick(cTime)
}

var sightFollow = false;
/* 轮询：根据歌曲进度更新进度条 */
function updateMusicSliderAuto(){
    if (music != null && !music.paused && !isMusicSliderMoving){ // 音乐已加载，正在播放且没有拖拽进度条
        //console.log("音乐更新进度条");
        var cTime = music.currentTime;
        // 更新进度条
        $("#slider-music").val(cTime);
        //$("#slider-music").css('background', bgRaw.format(sliderFrontColor, (cTime/musicDuration)*100));
        // 更新文本
        $("#slider-tick").text(tickToText(cTime));

        if (sightFollow){
            keepTickInSight(cTime, "inleft");
        }
    }
}

setInterval(updateMusicSliderAuto, musicSliderUpdateTime);

/* 切换是否跟随的按钮 */
function updateFollowSwitch(switchButton){
    //console.log($(switchButton).is(":checked"));
    sightFollow = $(switchButton).is(":checked");
    if (sightFollow){
        $("#music-follow-text").text("跟随开");
        // 提示
        showToast("视角跟随进度条 - 开启");
    }
    else{
        $("#music-follow-text").text("跟随关");
        // 提示
        showToast("视角跟随进度条 - 关闭");
    }
}

/* 文件拖拽 */

document.addEventListener("dragover", eventMuted);
document.addEventListener("dragenter", eventMuted);
document.addEventListener("dragleave", eventMuted);
function eventMuted(e){
    e.preventDefault();
}

document.addEventListener("drop", eventFileDrop)
function eventFileDrop(e){
    //console.log("拖放文件", e);
    e.preventDefault();

    if (isMusicLoading){
        showToast("等一下~正在加载上一个文件~");
        return;
    }
    // 检查是否是文件
    if (e.dataTransfer.files.length == 0){
        return;
    }
    var file = e.dataTransfer.files[0];

    // 显示并改变文本
    $("#music-hint-cover").text("加载中...");
    showMusicCover();

    // 加载音乐
    loadMusic(file);
}

/* 开启帮助面板 */
function showHelp(){
    $("#music-help").fadeIn(200);
}

/* 关闭帮助面板 */
function hideHelp(){
    $("#music-help").fadeOut(300);
}