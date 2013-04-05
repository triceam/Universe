var hasTouch = ('ontouchstart' in window);
var TOUCH_START = hasTouch ? "touchstart" : "mousedown";
var TOUCH_MOVE = hasTouch ? "touchmove" : "mousemove";
var TOUCH_END = hasTouch ? "touchend" : "mouseup";

var TILE_SIZE = 512;
var SPRITES_WORLD_SIZE = 3000;
var ENEMY_SPRITES_COUNT = 20;
var MIN_STYLE_SIZE = 750;
var FRICTION = .95;

var renders = 0;

var pop;
var gameover;
var playPop = false;

var gameState = {
    score: 0,
    remaining: ENEMY_SPRITES_COUNT
}

var time = {
    start:0,
    end:0,
    default:30000,
    active:false,
    $el:undefined
}

var world = {
    $el:undefined,
    el:undefined,
    tiles:[],
    tileSize:TILE_SIZE
}

var enemySprites  = {
    $el:undefined,
    el:undefined,
    sprites:[]
}

var hero = {
    $el:undefined,
    el:undefined,
    step:0,
    w:66,
    h:135,
    x:0,
    y:0,
    scale:1,
    direction:0
};

var touch = {
    $el:undefined,
    el:undefined,
    w:100,
    h:100,
    active:false
}

var input = {
    angle:0,
    distance:0,
    start:{x:0,y:0},
    current:{x:0,y:0},
    active:false
}


var translate = {
    x:0,y:0
};

var $win;
var $infoOverlay;


window.onerror = function(error) {
//    alert(error.toString());
    console.log(error);
};


function generateWorld(){

    world.$el.empty();
    world.tiles = [];

    var size = Math.max($win.width(), $win.height())
    world.cols = Math.ceil(size/TILE_SIZE)+1;
    world.rows = world.cols;

    for (var x=0; x<world.cols; x++) {

        world.tiles[x] = [];

        for (var y=0; y<world.rows; y++) {
            world.tiles[x][y] = new Tile(x, y, "#background", "", world);
        }

    }
}

function generateEnemySprites() {
    enemySprites.$el.empty();
    enemySprites.tiles = [];

    for (var x=0; x<ENEMY_SPRITES_COUNT; x++) {

        var sprite = getEnemySprite(enemySprites.el);
        enemySprites.sprites.push( sprite );
        sprite.direction = Math.random() * 2* Math.PI;
    }
}

function getEnemySprite(target){
    var x=Math.random() * SPRITES_WORLD_SIZE;
    var y=Math.random() * SPRITES_WORLD_SIZE;

    var style;
    var i = Math.floor(Math.random() * 9);
    switch (i) {
        case 1: style="ae"; break;
        case 2: style="au"; break;
        case 3: style="dr"; break;
        case 4: style="fl"; break;
        case 5: style="il"; break;
        case 6: style="id"; break;
        case 7: style="ph"; break;
        case 8: style="pr"; break;
        default: style="cc"; break;
    }

    return new Sprite(enemySprites.$el, x, y, style);
}

function render(){
    //console.log("render")

    if (!input.active) {
        if (input.distance > .01) {
            input.distance *= FRICTION;
        }
        else {
            input.distance = 0;
        }
    }
        translate.x += Math.sin( input.angle ) * Math.floor(input.distance);
        translate.y += Math.cos( input.angle ) * Math.floor(input.distance);

        translate.x = Math.floor(translate.x);
        translate.y = Math.floor(translate.y);



    for (var x=0; x<world.tiles.length; x++) {

        for (var y=0; y<world.tiles[x].length; y++) {
            world.tiles[x][y].updatePosition( translate.x, translate.y );
        }

    }

    for (var x=0; x<enemySprites.sprites.length; x++) {

        var sprite = enemySprites.sprites[x];

        var rand = Math.floor( Math.random() * 10 );
        if ( renders % (30+rand) == 0) {
            sprite.direction += (Math.random() * 2 > 1 ? 1 : -1 ) * Math.random() * Math.PI/3;
        }

        sprite.x += Math.sin(sprite.direction) * 2;
        sprite.y += Math.cos(sprite.direction) * 2;

        if (!sprite.hiding) {
            if ( sprite.scale > 1 || sprite.scale < .65){
                sprite.scaleModifier *= -1;
            }

            sprite.scale += sprite.scaleModifier;
        }
        else if (!sprite.hidden){
            sprite.scale += .03;
        }
        sprite.updatePosition( translate.x, translate.y );
    }



    hero.x = ($win.width() - hero.w)/2;
    hero.y = ($win.height() - hero.h)/2;
    hero.el.style["-webkit-transform"]="translate3d("+ hero.x +'px,'+ hero.y +"px,0px) rotate("+ hero.direction +"rad)";

    if ( input.distance > 0 && input.active ) {
        hero.$el.removeClass().addClass("hero_" + (renders%3));
    }
    else {
        hero.$el.removeClass();
    }


    if ( touch.visible ){

        var style = "translate3d("+ (input.current.x-(touch.w/2)) +'px,'+ (input.current.y-(touch.h/2)) +"px,0px)";
        touch.el.style["-webkit-transform"]= style;

    }
    else {
        //just render them offscreen
        touch.el.style["-webkit-transform"]="translate3d(-200px,-200px,0px)";
    }


    var centerX = $win.width()/2;
    var centerY = $win.height()/2;

    detectCollisions( translate.x, translate.y );
    updateTime();

    if ( playPop ) {
        if ( pop.seekTo != undefined ) {
            pop.seekTo(0);
        }
        pop.play();
        playPop = false;
    }

    renders++;

    window.requestAnimationFrame(function() {
        render()
    } );
}

function detectCollisions( translateX, translateY ) {

    var centerPoint = {
        x:$win.width()/2,
        y:$win.height()/2
    }

    var sprite;
    for ( var x=0; x< enemySprites.sprites.length; x++) {
        sprite = enemySprites.sprites[x];

        if ( !(sprite.hiding || sprite.hidden) && time.active ) {

            sprite.hitTest(centerPoint.x-translateX, centerPoint.y-translateY);
        }
    }
}

function updateTime() {
    var t = new Date().getTime();
    var t_remaining = time.end - t;
    var displayTime = "";
    if (time.active && t_remaining >= 0) {

        displayTime = formatTime(t_remaining);
    }
    else if (time.active && t_remaining < 0) {
        time.active = false
        displayTime = formatTime(0);
        end();
    }
    else {
        displayTime = formatTime(time.default);
    }

    if (time.lastTime != displayTime) {
        time.$el.text( displayTime );
        time.lastTime = displayTime;
    }

}

function formatTime(input) {
    input = input/1000;
    var m = Math.floor(input/60);
    var s = input %60;

    return m.toString(10) + ":" + (s<10 ? "0":"") + s.toFixed(0);
}

function Tile(col, row, target, css, model) {
    this.model = model;
    this.col = col;
    this.row = row;
    this.css = css;
    this.$el = $("<div></div>", {class: "tile " + css});
    this.el = this.$el.get(0);

    $(target).append( this.$el );
}

Tile.prototype.updatePosition = function ( _x, _y ) {

    var size = this.model.tileSize;
    var x = ((this.col) * size + _x);
    var y = ((this.row) * size + _y);

    var world_cols_size = (this.model.cols)*size;
    var world_rows_size = (this.model.rows)*size;

    x = (x.mod(world_cols_size))-size;
    y = (y.mod(world_rows_size))-size;

    if (this.lastX != x || this.lastY != y) {
        this.el.style["-webkit-transform"]="translate3d("+ x +'px,'+ y +"px,0px)";
        this.lastX = x;
        this.lastY = y;
    }

}

function addTapHandler( obj, handler ){

    if (hasTouch) {
        obj.tap( handler );
    }
    else {
        obj.on( TOUCH_START, handler );
    }
}


function Sprite(target, x, y, css) {
    this.target = target;
    this.x = x;
    this.y = y;
    this.css = css;
    this.$el = $("<div></div>", {class: "sprite " + css});
    this.el = this.$el.get(0);
    this.scale = 1;
    this.opacity = 1;
    this.hiding = false;
    this.hidden = false;
    this.scaleModifier = .005 + (.01 * Math.random());

    var css=document.styleSheets[0]
    var rules=css.cssRules;
    for (var i=0; i<rules.length; i++){
        if(rules[i].selectorText == ".sprite"){

            this.width = parseInt( rules[i].style.width );
            this.height = parseInt( rules[i].style.height );
            break;
        }
    }


    var self = this;
    var tapHandler =  function(event){
        return self.tapHandler(event);
    };

    addTapHandler( this.$el, tapHandler );

    $(target).append( this.$el );
}

Sprite.prototype.updatePosition = function ( _x, _y ) {

    var size = SPRITES_WORLD_SIZE;
    var x = this.x + _x;
    var y = this.y + _y;

    x = (x.mod(size)) - 500;
    y = (y.mod(size)) - 500;

    if (this.lastX != x || this.lastY != y || this.scale != this.lastScale) {
        this.el.style["-webkit-transform"]="translate3d("+ x +'px,'+ y +"px,0px) " + (this.scale != 1 ? "scale("+this.scale+")" : "");
        this.lastX = x;
        this.lastY = y;
        this.lastScale = this.scale;
    }

    if ( this.hiding && !this.hidden ) {
        this.opacity -= .07;
        if ( this.opacity <= 0 ){
            this.$el.addClass("hidden");
            this.hiding = false;
            this.hidden = true;
        }
        else {
            this.$el.css("opacity", this.opacity);
        }

    }
}

Sprite.prototype.hitTest = function ( _x, _y ) {

    var size = SPRITES_WORLD_SIZE;
    var x = this.x;
    var y = this.y;

    x = ((x-500).mod(size));
    y = ((y-500).mod(size));



    var points = [{x:0, y:0},
        {x:0, y:45},
        {x:0, y:-45},
        {x:45, y:0},
        {x:-45, y:0} ]

    var tl, tr, bl, activePoint, hitX, hitY;

    if ( !(this.hiding || this.hidden) && time.active ) {
        tl = {x:x,y:y};
        tr = {x:tl.x+this.width,y:tl.y};
        bl = {x:tl.x,y:tl.y+this.height};

        for ( var i=0; i<points.length; i++) {
            var p = points[i];
            hitX = ((_x).mod(size))+p.x;
            hitY = ((_y).mod(size))+p.y;

            if ( tl.x <= hitX && tr.x >= hitX &&
                tl.y <= hitY && bl.y >= hitY ) {

                this.tapHandler();
                return;
            }
        }
    }
}


Sprite.prototype.tapHandler = function ( event ) {

    if ( !this.hiding ){
        this.hiding = true;
        this.$el.addClass("inactive");
        updateScore();
        playPop = true;
    }
    //console.log ("tap")
    if ( event ){
        event.preventDefault();
        event.stopPropagation();
    }
    return false;

}



function onTouchStart( event ) {

    event.preventDefault();
    event.stopPropagation();
    if (event.touches != undefined) {
        event = event.touches[0];
    }

    input.active = true;
    input.start = {
        x: $win.width()/2,
        y: $win.height()/2
    }
    input.current = {
        x: event.pageX,
        y: event.pageY
    }
    calculateInputTransform();
    touch.visible = true;

    document.removeEventListener( TOUCH_START, onTouchStart );
    document.addEventListener( TOUCH_MOVE, onTouchMove );
    document.addEventListener( TOUCH_END, onTouchEnd );

    return false;
}

function onTouchMove( event ) {

    event.preventDefault();
    event.stopPropagation();
    if (event.touches != undefined) {
        event = event.touches[0];
    }

    input.current = {
        x: event.pageX,
        y: event.pageY
    }
    calculateInputTransform();

    return false;
}

function onTouchEnd( event ) {

    event.preventDefault();
    event.stopPropagation();
    if (event.touches != undefined) {
        event = event.touches[0];
    }

    input.active = false;
    input.start = {
        x: 0,
        y: 0
    }
    input.current = {
        x: 0,
        y: 0
    }
    calculateInputTransform(false);
    //resetHero();
    touch.visible = false;

    document.addEventListener( TOUCH_START, onTouchStart );
    document.removeEventListener( TOUCH_MOVE, onTouchMove );
    document.removeEventListener( TOUCH_END, onTouchEnd );

    return false;
}

function calculateInputTransform(updateHero) {

    if (input.active) {

        input.angle = angle(input.start, input.current);
        input.distance = distance(input.start, input.current)/10;

        if (input.distance > 0) {

            var pi2 = Math.PI * 2;

            var a = input.angle % pi2;

            while ( a < 0 ) {
                a += pi2;
            }
            hero.direction = pi2-a;
        }
    }

}

function distance( a, b ) {

    var _x = Math.pow(b.x - a.x, 2);
    var _y = Math.pow(b.y - a.y, 2);

    var result = Math.sqrt( _x + _y );
    return result;
}

function angle( a, b ) {

    var _x = -(b.x - a.x);
    var _y = -(b.y - a.y);

    var result = Math.atan2( _x, _y );
    return result;
}


Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
}

function updateScore() {

    if (time.active){
        var t_remaining = time.end - new Date().getTime();
        gameState.score += (t_remaining/100) << 0;
        gameState.remaining --;
        updateHUD();
        if (gameState.remaining <= 0) {
            end();
        }
    }
}

function updateHUD() {

    $("#hud").html( gameState.score + "<br/><span class='warning'>" + gameState.remaining + "/" + ENEMY_SPRITES_COUNT + "</span>");
}


function start() {
    if ( time.active ) return;

    gameState.score = 0;
    gameState.remaining = ENEMY_SPRITES_COUNT;
    updateHUD();

    time.start = new Date().getTime();
    time.end = time.start + time.default;
    time.active = true;

    generateEnemySprites();

    $infoOverlay.addClass( "hidden" );
}

function end() {

    gameover.play();

    $infoOverlay.removeClass( "hidden" );
    $infoOverlay.find("H1").html("Game Over").addClass("warning");

    var t = new Date().getTime() - time.start;
    var message = "You collected <span class='highlight'>" + (ENEMY_SPRITES_COUNT-gameState.remaining) + "</span> Adobe tools in <span class='highlight'>" + formatTime(t) + "</span> with a score of <span class='highlight'>" + gameState.score + "</span> points!";
    $infoOverlay.find("#message").html( message );
    time.active = false;
}

//detect if web or phonegap ( via http://stackoverflow.com/questions/8068052/phonegap-detect-if-running-on-desktop-browser)
function isPhoneGap() {
    return ((cordova || PhoneGap || phonegap)
        && /^file:\/{3}[^\/]/i.test(window.location.href)
        && /ios|iphone|ipod|ipad|android/i.test(navigator.userAgent)) ||
        window.tinyHippos; //this is to cover phonegap emulator
}

function canPlayHTMLAudio() {
    var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

    if (iOS) {
        return false;
    }

    var a = document.createElement('audio');
    return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
}

function initAudio() {
    if ( isPhoneGap() ) {
        if (device.platform == "Android") {
            pop = new Media("/android_asset/www/assets/sounds/pop.mp3");
            gameover = new Media("/android_asset/www/assets/sounds/game_over.mp3");
            //bgLoop = new Media( "/android_asset/www/assets/sounds/115261__rap2h__1mi.wav", onSoundSuccess, onSoundError, onSoundStatus);
        } else {
            pop = new Media("assets/sounds/pop.mp3");
            gameover = new Media("assets/sounds/game_over.mp3");
            //bgLoop = new Media( "assets/sounds/115261__rap2h__1mi.wav", onSoundSuccess, onSoundError, onSoundStatus);
        }

        //this forces preloading the asset into memory
        pop.play();
        pop.stop();
    }
    else {
        pop = document.createElement('audio');
        pop.autoplay = false;
        pop.preload = "auto";
        pop.src = "assets/sounds/pop.mp3";

        gameover = document.createElement('audio');
        gameover.autoplay = false;
        gameover.preload = "auto";
        gameover.src = "assets/sounds/game_over.mp3";
    }
}

function init(event) {

    initAudio();

    $win = $(window);
    $infoOverlay = $("#infoOverlay");
    time.$el = $("#time");


    addTapHandler( $("#play"), start );


    world.$el = $("#background");
    world.el = world.$el.get(0);

    enemySprites.$el = $("#enemySprites");
    enemySprites.el = enemySprites.$el.get(0);

    generateWorld();

    hero.scale = ($win.height() * hero.heightTarget)/hero.h;
    hero.$el = $("#hero");
    hero.el = hero.$el.get(0);

    touch.$el = $("#touch");
    touch.el = touch.$el.get(0);

    if ($win.width() > MIN_STYLE_SIZE || $win.height() > MIN_STYLE_SIZE) {
        $(".overlayContainer").addClass("large");
    }

    document.addEventListener( TOUCH_START, onTouchStart );

    render();
    $("body").css("display", "block");
};



if ( isPhoneGap() ) {
    document.addEventListener( "deviceready", init );
}
else {
    window.addEventListener( "load", init );
}

