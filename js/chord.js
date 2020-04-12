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
	"D" : 1,
	"E" : 2,
	"F" : 3,
	"G" : 4,
	"A" : 5,
	"B" : 6,
}

var chord_list = {
	"C" : [3, 0, 0, 0],
	"F" : [0, 1, 0, 2],
    "C" : [3, 0, 0, 0],
    "F" : [0, 1, 0, 2],
    "G" : [2, 3, 2, 0],
    "Am" : [0, 0, 0, 2],
    "Em" : [2, 3, 4, 0],
    "D" : [0, 2, 2, 2],
    "A" : [0, 0, 1, 2],
    "Bm" : [2, 2, 2, 4],
    "Dm" : [0, 1, 2, 2],
    "B" : [2, 2, 3, 4],
    "A7" : [0, 0, 1, 0],
    "Bb" : [1, 1, 2, 3],
    "C7" : [1, 0, 0, 0],
    "D7" : [3, 2, 2, 2],
    "Cm" : [1, 1, 1, 3],
    "E" : [2, 4, 4, 4],
    "E7" : [2, 0, 2, 1],
    "F7" : [3, 1, 3, 2],
    "Fm" : [3, 1, 0, 1],
    "G7" : [2, 1, 2, 0],
    "Gm" : [1, 3, 2, 0],
    "bA" : [3, 4, 3, 1],
}



var arpeggioTime = 0.2;
var arpeggioDown = true;
var volume = 1.0;
var musicVolume = 1.0;

var chordTableSortable;
var trashSortable;

var isDragging = false; // 判断是否在拖拽

$(function(){ // 初始化
	// 音量初始值
	volume = $("#slider-volume").val();

	// 琶音时间初始值
	arpeggioTime = $("#slider-arpeggio-time").val();

	// 创建sortable
	var chordTable = document.getElementById('chord-table');
	chordTableSortable = new Sortable(chordTable, {
		group: "chord",
		animation: 150,
		ghostClass: "chord-block-ghost", // 出现在列表中的副本添加的class
		onStart: sortableStart,
		onEnd: sortableEnd
	});

	// 创建垃圾箱的sortable
	var trash = document.getElementById('delete-zone');
	trashSortable = new Sortable(trash, {
		group: "chord",
		onAdd: trashSortableAdd
	});

	// 添加的和弦列表mouseleave
	var $addChordTable = $("#add-chord-table");
	$addChordTable.mouseleave(function(){
		closeAddChordTable();
	});

	// 添加的垃圾箱mouseenter和mouseleave
	var $trashZone = $("#delete");
	$trashZone.mouseenter(function(){
        if (!isDragging){
            $trashZone.stop(true, true).animate({"background-color": "red"}, 100);
        }
		
	});
	$trashZone.mouseleave(function(){
        if (!isDragging){ // 在拖拽时，在鼠标移入时却会触发mouseleave，怀疑是bug，因此增加了限定条件
            $trashZone.stop(true, true).animate({"background-color": "#aaf"}, 100);
        }
	});

    // 滑动条的初始化
    updateSliderArpeggioTime($("#slider-arpeggio-time").get(0));
    updateSliderVolume($("#slider-volume").get(0));

    // 加载音频
    loadAudio();

    // 

    $("chord-block").bind("contextmenu",function(e){
        showToast("右键菜单");
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

/* 事件：和弦开始拖拽 */
function sortableStart(evt){
    isDragging = true;
	$("#delete").stop(true, true).animate({"background-color": "white"}, 200);
}
/* 事件：和弦结束拖拽 */
function sortableEnd(evt){
    isDragging = false;
	$("#delete").stop(true, true).animate({"background-color": "#aaf"}, 200);
}
/* 事件：和弦拖入垃圾箱 */
function trashSortableAdd(evt){
	$(evt.srcElement).remove(); // 销毁和弦块
	showToast("已删除") // 提示信息
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
/* 音调转索引 */
function keyToIndex(key){
	// RE匹配
	var reg = /([A-Zb#]+)(\d)/;
	var res = key.match(reg);
	
	// 获取音名和组
	var keyName = res[1];
	var keyNameIndex = 0;
	var keyNameCut = keyName;
	if (keyName.length > 2){ // 有升号
		throw ('和弦格式错误：' + keyName);
	}

	if (keyName.indexOf('#') != -1){ // 有升号
		keyNameIndex = 1;
		var keyNameCut = keyNameCut.replace('#', ''); // 去除#
	}
	else if (keyName.indexOf('b') != -1){ // 有降号
		keyNameIndex = -1;
		var keyNameCut = keyNameCut.replace('b', ''); // 去除b
	}
	keyNameIndex = keyNameIndex + key_map[keyNameCut];

	var group = res[2].charCodeAt() - '0'.charCodeAt();

	// 计算索引，C4对应索引0
	var index = (group - 4) * 7 + keyNameIndex;

	// 防止越界
	index = Math.max(0, Math.min(24, index));

	// 返回
	return index;
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

/* 添加和弦 */
function addChord(chordName){
    // 检查是否有该和弦
    if (chord_list.hasOwnProperty(chordName)){
        var $newChord = $("<li class=\"chord-block flex-center\" onclick=\"playChordClick(this, \'" + chordName + "\')\">" + chordName + "</li>");
        $newChord.css("opacity", "0.0");

        var $chordTable = $("#chord-table");
        $chordTable.append($newChord);
        $newChord.animate({opacity: 1.0}, 300, function(){
            $newChord.removeAttr("style"); // 关闭和弦按钮渐变动画
        });
        return true;
    }
    else{
        alert("未找到和弦" + chordName);
        return false;
    }
}
/* 清空所有和弦 */
function deleteAllChord(){
    var $chordTable = $("#chord-table");
    $chordTable.empty();
}
/* 显示和弦列表 */
function showAddChordTable(){
    console.log("打开和弦列表");
    var $addChordTable = $("#add-chord-table");
    $addChordTable.css("opacity", "0");
    $addChordTable.stop(false, true).animate({opacity: 1}, 200);
    $addChordTable.show();
}
/* 关闭和弦列表 */
var isClosing = false;
function closeAddChordTable(){
    var $addChordTable = $("#add-chord-table");
    if (!isClosing && $addChordTable.css("display") != "none"){
        console.log("关闭和弦列表");
        isClosing = true;
        
        $addChordTable.css("opacity", "1");
        $addChordTable.stop(false, true).animate({opacity: 0}, 500, function(){
            $addChordTable.hide();
            isClosing = false;
        });
    }
}

/* 显示气泡提示 */
function showToast(text, duration = 1.0){
    var $toast = $("#toast");
    $toast.stop(true, true);
    $toast.text(text);
    $toast.css("opacity", "0");
    $toast.css("display", "flex");
    $toast.animate({opacity: 1}, 100);
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

/* 按钮事件：添加和弦 */
function addChordClick(button, chordName){
    if (addChord(chordName)){
        // 特效
        // 1. 符号上飘
        var $floatSymbol = $("<div class=\"ef-plus\">+</div>");
        var buttonWidth = $(button).innerWidth();
        $floatSymbol.css("left", $(button).offset().left).css("left", "+={0}px".format(buttonWidth));
        $floatSymbol.css("top", $(button).offset().top);
        $(document.body).append($floatSymbol);
        $floatSymbol.animate({top: "-=20px", opacity: 0}, 500, function(){
            $floatSymbol.remove();
        });
    }
}

/* 按钮事件：打开和弦列表 */
function chordListClick(){
	// 动态生成列表
	var $addChordTable = $("#add-chord-table");
	$addChordTable.empty();
	// 关闭按钮
	var $closeButton = $("<li class=\"chord-block flex-center\" onclick=\"closeAddChordTable()\"></li>");
	$closeButton.css("font-size", "18px");
	$closeButton.css("background-color", "#faa");
    $closeButton.css("width", "calc(100% - 40px)");
    $closeButton.append("<embed src=\"imgs/cross.svg\" type=\"image/svg+xml\"/>")
	$addChordTable.append($closeButton);

	// 和弦列表
	for (chordName in chord_list){
		var $newChord = $("<li class=\"chord-block flex-center\" onclick=\"addChordClick(this, \'" + chordName + "\')\">" + chordName + "</li>");
		$addChordTable.append($newChord);
	}
	// 显示
	showAddChordTable();
}
/* 按钮事件：清空所有和弦 */
function deleteAllChordClick(){
    if (confirm("要清空所有和弦吗？")){
        deleteAllChord();
        showToast("已清空所有和弦");
    }
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

var music = null;
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