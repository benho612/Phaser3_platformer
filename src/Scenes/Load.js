class Load extends Phaser.Scene {
    constructor() {
        super("Load");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load the main level tilemap (TMX format from Tiled)
        this.load.tilemapTiledJSON("level1", "level1.tmj");
        this.load.tilemapTiledJSON("level2", "level2.tmj");

        // Load the tileset images used in Tiled
        this.load.image("tiles", "tilemap_packed.png");                        // for "Pixel_Platformer"
        this.load.image("backgrounds", "tilemap-backgrounds_packed.png");     // for "tilemap-backgrounds_packed"

        // Load character spritesheet
        this.load.atlas("platformer_characters", "tilemap-characters-packed.png", "tilemap-characters-packed.json");

        // Optional: Load tilemap as spritesheet if you want individual tiles as sprites
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        // Particle assets (if using Kenny Particle Pack)
        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        //
        this.load.audio('bgm', 'music/time_for_adventure.mp3');

        this.load.audio('jump', 'sounds/jump.wav');

        this.load.audio('collect','sounds/coin.wav');

        this.load.audio('Dialogue','sounds/Dialogue.wav');
        
        const font = new FontFace('PixelFont', 'url(./assets/fonts/PixelOperator8-Bold.ttf)');

        font.load().then((loadedFace) => {
            document.fonts.add(loadedFace);
            console.log('Font loaded!');
            this.fontLoaded = true;
        }).catch((err) => {
            console.error('Font load error:', err);
        });

    }

    create() {
        // Define player animations
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('platformer_characters', {
                prefix: "tile_",
                start: 0,
                end: 1,
                suffix: ".png",
                zeroPad: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0000.png" }
            ],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0001.png" }
            ],
        });

        //coin
        this.anims.create({
            key: 'coinSpin',
            frames: this.anims.generateFrameNumbers('tilemap_sheet', {
                start: 151,
                end: 152
            }),
            frameRate: 8,
            repeat: -1
        });

        // Start the next scene
        this.scene.start("start_scene");
    }

    update() {}
}
