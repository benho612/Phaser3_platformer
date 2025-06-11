class game_scene extends Phaser.Scene {
    constructor() {
        super("game_scene");
    }

    init(data) {
        // variables and settings
        this.ACCELERATION = 600;     // Faster start
        this.DRAG = 1200;            // Less sliding
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -400;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.levelName = data?.level || "level1";
        this.inventory = data?.inventory || [];

        this.wasOnGround = false;
        this.jumpCount = 0;
        this.maxJumps = 2;

        this.score = 0;
        this.levelCompleted = false;
        this.levelFailed = false;

        this.inventoryVisible = false;
        this.howToPlayGroup = null;
        this.pauseMenuGroup = null;
        this.isPaused = false;

        this.npcDialogIndex = 0;
        this.inNpcZone = {};
        this.inDialogue = false;

    }

    create() {
        this.map_setting();
        this.water_tile_sfx();

        this.background_music();
        this.sfx(); 


        this.object_creation();
        this.npc_creation();
        this.inventoryIcons = [];
        this.inventoryVisible = false;



        // set up player avatar
        my.sprite.player = this.physics.add.sprite(20, 0, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setMaxVelocity(200, 600);
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.physics.add.collider(my.sprite.player, this.movingPlatforms);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            random: true,
            scale: {start: 0.03, end: 0.05},
            lifespan: 350,
            alpha: {start: 1, end: 0.1}, 
        });

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (player, coin) => {
            coin.destroy();
            this.collect.play();
            this.coinEmitter = this.add.particles(0,0,'kenny-particles', {
            frame: ['star_06.png', 'star_07.png'],
            scale: 0.1,
            speed: { min: 20, max: 60 },
            active: false,
            lifespan: 600,
            alpha: {start: 1, end: 0.1}
        });

            this.score += 100;
            this.coinEmitter.explode(6, coin.x, coin.y);
            this.time.delayedCall(500, () => this.coinEmitter.destroy(), [], this);
        });

        //Diamond Collision handler
        this.physics.add.overlap(my.sprite.player, this.diamondGroup, (player, diamond) => {
            this.inventory.push(diamond.name);
            diamond.destroy();
            this.collect.play();
            this.updateInventoryUI();
        }, null, this);

        // Overlap detection
        this.physics.add.overlap(my.sprite.player, my.sprite.npc, () => {
            this.inNpcZone = true;
        }, null, this);

        this.text_creation();

        this.updateInventoryUI();

        this.camera();

        this.key_bind();

        this.createPauseMenu();

        this.createHowToPlayPanel();

        this.uiCamera.ignore(this.children.list.filter(obj =>
            !this.pauseMenuGroup.contains(obj) &&
            !this.howToPlayGroup.contains(obj) &&
            obj !== this.inventoryText
        ));

    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.toggleKey)) {
            this.inventoryVisible = !this.inventoryVisible;
            if (this.inventoryVisible) {
                this.physics.world.pause();
                this.inventoryText.setVisible(true);
                this.inventoryBg.setVisible(true);
            } else {
                this.physics.world.resume();
                this.inventoryText.setVisible(false);
                this.inventoryBg.setVisible(false);

            }
            this.updateInventoryUI();
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
            if (this.isPaused) 
                this.resumeGame();
            else 
                this.pauseGame();
        }
        if (this.isPaused) return; // Freeze update loop

        if(this.coinEmitter)
            this.uiCamera.ignore(this.coinEmitter);
        
        this.scoreBox.setText(this.score);
        this.scoreBox.setPosition(my.sprite.player.x, my.sprite.player.y + 40);
        this.show_interact_npc();

        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
            this.npcGroup.getChildren().forEach(npc => {
                if (this.inNpcZone[npc.name]) {
                    npc.interact();
                }
            });
        }

        //moving plaformers
        this.movingPlatforms.getChildren().forEach(tile => {
            if (!tile.body) return;

            // Enforce gravity OFF just in case
            tile.body.setAllowGravity(false);
        });

        this.tubeGroups.forEach(tube => {
            tube.parts.forEach(part => {
                part.setVelocityX(tube.speed);
            });

            const mid = tube.parts[1];
            if (mid.x <= tube.minX) {
            tube.speed = Math.abs(tube.speed);  // Force right
            tube.parts.forEach(p => p.x = tube.minX + (p.x - mid.x)); // Clamp position
            }
            else if (mid.x >= tube.maxX) {
                tube.speed = -Math.abs(tube.speed); // Force left
                tube.parts.forEach(p => p.x = tube.maxX + (p.x - mid.x)); // Clamp position
            }
        });


        // Get player's bottom center tile coordinates
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);
        const currentTile = this.groundLayer.getTileAt(playerTileX, playerTileY);

        // Determine if player is in water
        const inWater = currentTile && currentTile.properties.water;

        if (inWater) {
            // Apply underwater physics
            this.physics.world.gravity.y = 400;
            my.sprite.player.setDragX(800);
            my.sprite.player.setMaxVelocity(100, 250);
            my.sprite.player.setTint(0x80d0ff);  // Optional: visual cue
        } else {
            // Normal physics
            this.physics.world.gravity.y = 1500;
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.setMaxVelocity(200, 600);
            my.sprite.player.clearTint();
        }

        // Check if the player is on a ladder tile
        const ladderTile = this.groundLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y + my.sprite.player.height / 2
        );

        const onLadder = ladderTile && ladderTile.properties.ladder;
        if (onLadder && this.keys.up.isDown) {
            this.physics.world.gravity.y = 0;
            my.sprite.player.setVelocityY(-100);
            my.sprite.player.setDragX(800);
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setMaxVelocity(150, 150);
            my.sprite.player.setTint(0xffddaa);

            if (!this.ladderSound.isPlaying) {
                this.ladderSound.play();
            }
        } else {
            if (this.ladderSound.isPlaying) {
                this.ladderSound.stop();
            }
            this.physics.world.gravity.y = 1500;
            my.sprite.player.clearTint();
        }


        if(this.keys.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(this.keys.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }
        this.movingPlatforms.getChildren().forEach(platform => {
            const touchingFromAbove =
                my.sprite.player.body.blocked.down &&
                platform.body.touching.up &&
                Phaser.Geom.Intersects.RectangleToRectangle(my.sprite.player.getBounds(), platform.getBounds());

            if (touchingFromAbove) {
                const delta = this.game.loop.delta / 1000;
                my.sprite.player.x += platform.body.velocity.x * delta;
            }
        });

        this.win_lose_mechanics();
        this.double_jump_mechanics();

    }

    win_lose_mechanics() {
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);
        const tile = this.decorationLayer.getTileAt(playerTileX, playerTileY);

        // Win condition
        if (tile && tile.properties.isFlag && !this.levelCompleted) {
            this.levelCompleted = true;
            this.scene.start("end_scene", {
                result: "completed",
                score: this.score,
                inventory: this.inventory
            });
            this.bgm.stop();
        }

        this.physics.add.overlap(my.sprite.player, this.spikeGroup, () => {
            if (!this.levelFailed && !this.levelCompleted) {
                this.levelFailed = true;

                this.bgm.stop();
                this.hurt.play();

                my.sprite.player.setVelocity(0);
                my.sprite.player.body.enable = false;

                this.tweens.add({
                    targets: my.sprite.player,
                    angle: 360,
                    duration: 1000,
                    ease: 'Cubic.easeInOut',
                    onComplete: () => {
                        this.scene.start("end_scene", {
                            result: "failed",
                            score: this.score
                        });
                    }
                });
            }
        });
    }

    double_jump_mechanics()
    {
        // player jump
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        let isOnGround = my.sprite.player.body.blocked.down;

        // Reset jump count only when landing
        if (isOnGround && !this.wasOnGround) {
            this.jumpCount = 0;
        }

        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.keys.up) && this.jumpCount < this.maxJumps) {
            if (this.jumpCount === 0) {
                my.sprite.player.setVelocityY(this.JUMP_VELOCITY);
                
            } else {
                my.sprite.player.setVelocityY(this.JUMP_VELOCITY * 0.8);
            }
            this.jump = this.sound.add('jump',{volume: 0.2});
            this.jump.play();
            this.jumpCount++;
        }

        this.wasOnGround = isOnGround;


    }

    key_bind()
    {
        // set up Phaser-provided cursor key input
        this.keys = this.input.keyboard.addKeys({
        toggleKey: Phaser.Input.Keyboard.KeyCodes.I,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        E: Phaser.Input.Keyboard.KeyCodes.E,
        ESC: Phaser.Input.Keyboard.KeyCodes.ESC
        });

    }

    map_setting()
    {
        this.map = this.add.tilemap(this.levelName);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("Pixel_Platformer", "tiles");
        this.bgTileset = this.map.addTilesetImage("tilemap-backgrounds_packed", "backgrounds");

        // Create a layer
        this.backgroundLayer = this.map.createLayer("Background", this.bgTileset);

        this.groundLayer = this.map.createLayer("Ground", this.tileset);

        this.decorationLayer = this.map.createLayer("Decoration", this.tileset);

        this.pBackgroundLayer = this.map.createLayer("P_Background", this.tileset);

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.groundLayer.setCollisionByProperty({ collides: true });

    }

    background_music() {
        const savedVolume = parseFloat(localStorage.getItem('volume') || '0.5');

        // Check if 'bgm' already exists
        if (!this.sound.get('bgm')) {
            this.bgm = this.sound.add('bgm', {
                loop: true,
                volume: savedVolume
            });
            this.bgm.play();
        } else {
            this.bgm = this.sound.get('bgm');

            // If the BGM exists but isn't playing (e.g., paused between levels), resume it
            if (!this.bgm.isPlaying) {
                this.bgm.play();
            }

            // Always ensure the volume is current
            this.bgm.setVolume(savedVolume);
    }
    }

    water_tile_sfx(){
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });

        this.waterTiles.forEach(tile => {
            this.waterEmitter = this.add.particles(tile.getCenterX(),tile.getCenterY(),'kenny-particles', {
            frame: 'smoke_03.png',
            lifespan: { min: 1000, max: 2000 },
            speedY: { min: -30, max: -60 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 0.5, end: 0 },
            frequency: 100
            })
        });
    }

    camera(){
        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);
        this.uiCamera.ignore(this.children.list.filter(obj => obj !== this.inventoryText && obj !== this.inventoryBg));        
        this.cameras.main.ignore(this.inventoryText);
    }

    showNpcMessage(message, npc) {

        if (this.Dialogue.isPlaying) 
            this.Dialogue.stop();
        this.Dialogue.play();

        this.npcTextBox.setText(message);
        this.npcTextBox.setPosition(npc.x, npc.y - 40);
        this.npcTextBox.setVisible(true);
    }

    show_interact_npc() {
        let anyNpcInZone = false;

        this.npcGroup.getChildren().forEach(npc => {
            const isOverlapping = this.physics.overlap(my.sprite.player, npc);
            this.inNpcZone[npc.name] = isOverlapping;

            if (isOverlapping && !this.inDialogue) {
                this.npcText.setText('Press E to talk');
                this.npcText.setPosition(npc.x, npc.y - 40);
                this.npcText.setVisible(true);
                anyNpcInZone = true;
            }
        });

        if (!anyNpcInZone || this.inDialogue) 
            this.npcText.setVisible(false);
    }

    updateInventoryUI() {
        // Always clear the old icons/text first
        this.inventoryIcons.forEach(icon => icon.destroy());
        this.inventoryIcons = [];
    
        if (!this.inventoryVisible) {
            return;
        }

        this.inventoryBg.setPosition(this.scale.width / 2, this.scale.height / 2);

        this.inventoryText.setText('Inventory: '); 
        const diamondCount = this.inventory.filter(item => item === 'diamond').length;
    
        if (diamondCount > 0) {
            // Show diamond icon
            const icon = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'diamond_icon');
            icon.setScale(4);
            icon.setScrollFactor(2);
            this.inventoryIcons.push(icon);
    
            // Show count if more than 1
            if (diamondCount >= 1) {
                const countText = this.add.text(icon.x + 50, icon.y + 50, `x${diamondCount}`, {
                    fontSize: '32px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4
                });
                countText.setScrollFactor(2);
                this.inventoryIcons.push(countText);
            }
        }
    }
    
    createPauseMenu() {
        this.pauseMenuGroup = this.add.group();

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const bg = this.add.rectangle(centerX, centerY, 200, 210, 0x000000, 0.7).setOrigin(0.5);
        const textStyle = {
            fontFamily: 'PixelFont',
            fontSize: '16px',
            fill: '#ffffff'
        };

        this.returnBtn = this.add.text(centerX, centerY - 70, 'Return', textStyle).setOrigin(0.5).setInteractive();
        this.restartBtn = this.add.text(centerX, centerY - 40, 'How to play', textStyle).setOrigin(0.5).setInteractive();
        this.quitBtn = this.add.text(centerX, centerY - 10, 'Quit', textStyle).setOrigin(0.5).setInteractive();

        this.returnBtn.on("pointerover", () => this.returnBtn.setStyle({ fill: "#ffff00" }));
        this.returnBtn.on("pointerout", () => this.returnBtn.setStyle({ fill: "#ffffff" }));

        this.restartBtn.on("pointerover", () => this.restartBtn.setStyle({ fill: "#ffff00" }));
        this.restartBtn.on("pointerout", () => this.restartBtn.setStyle({ fill: "#ffffff" }));

        this.quitBtn.on("pointerover", () => this.quitBtn.setStyle({ fill: "#ffff00" }));
        this.quitBtn.on("pointerout", () => this.quitBtn.setStyle({ fill: "#ffffff" }));

        this.returnBtn.on('pointerdown', () => this.resumeGame());
        this.restartBtn.on('pointerdown', () => this.howToPlayGroup.setVisible(true));
        this.quitBtn.on('pointerdown', () => {
        const bgm = this.sound.get('bgm');
        if (bgm) {
            bgm.stop();
            bgm.destroy();
        }
            this.scene.start('start_scene');
        });

        // Volume label
        const volumeLabel = this.add.text(centerX, centerY + 50, 'Volume:', textStyle).setOrigin(0.5);

        // Slider bar
        const sliderWidth = 100;
        const sliderBar = this.add.rectangle(centerX, centerY + 70, sliderWidth, 10, 0xaaaaaa).setOrigin(0.5);

        // Slider handle
        const sliderHandle = this.add.rectangle(centerX, centerY + 70, 10, 20, 0xffffff).setOrigin(0.5).setInteractive({ draggable: true });

        this.input.setDraggable(sliderHandle);

 
        sliderHandle.on('drag', (pointer, dragX) => {
            const minX = centerX - sliderWidth / 2;
            const maxX = centerX + sliderWidth / 2;
            dragX = Phaser.Math.Clamp(dragX, minX, maxX);
            sliderHandle.x = dragX;

            // Convert position to volume (0.0 - 1.0)
            const volume = (sliderHandle.x - minX) / sliderWidth;
            this.sound.volume = volume;
        });

        this.pauseMenuGroup.addMultiple([bg, this.returnBtn, volumeLabel, sliderBar, sliderHandle, this.restartBtn, this.quitBtn]);
        this.pauseMenuGroup.setVisible(false);

        this.cameras.main.ignore(this.pauseMenuGroup.getChildren());
    }

    createHowToPlayPanel() {
        this.howToPlayGroup = this.add.group();

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const panelBg = this.add.rectangle(centerX, centerY, 300, 220, 0x000000, 0.85).setOrigin(0.5);
        const instructions = [
            'Controls:',
            'A : Move Left',
            ' D : Move Right',
            'W : Jump',
            'E : Interact',
            'ESC : Pause Game',
            'I : Inventory'
        ];

        const textStyle = {
            fontFamily: 'PixelFont',
            fontSize: '14px',
            fill: '#ffffff',
            align: 'center'
        };

        const lineSpacing = 24;
        instructions.forEach((line, i) => {
            const lineText = this.add.text(centerX, centerY - 90 + i * lineSpacing, line, textStyle).setOrigin(0.5);
            this.howToPlayGroup.add(lineText);
        });

        const closeBtn = this.add.text(centerX, centerY + 70, 'Close', {
            fontFamily: 'PixelFont',
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#444444',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            this.howToPlayGroup.setVisible(false);
        });

        this.howToPlayGroup.addMultiple([panelBg, closeBtn]);
        this.howToPlayGroup.setVisible(false);

        this.cameras.main.ignore(this.howToPlayGroup.getChildren());
    }

    pauseGame() {
        this.isPaused = true;
        this.physics.world.pause();
        this.pauseMenuGroup.setVisible(true);
        this.sound.pauseAll();
    }

    resumeGame() {
        this.isPaused = false;
        this.physics.world.resume();
        this.pauseMenuGroup.setVisible(false);
        this.sound.resumeAll();
    }

    text_creation(){
        this.npcText = this.add.text(0, 0, '', {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.npcTextBox = this.add.text(0, 0, '', {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        this.scoreBox = this.add.text(my.sprite.player.x, my.sprite.player.y - 40, this.score, {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.inventoryText = this.add.text(670, 320, 'Inventory: ', {
            fontFamily: 'PixelFont',
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000',
            align: "center",
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(100).setVisible(false);

        this.inventoryBg = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.8)
            .setScrollFactor(0)
            .setDepth(99)
            .setVisible(false);

    }

    object_creation(){
        //Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });
        this.coins.forEach(coin => {
            coin.anims.play('coinSpin');
        });
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        //Create Diamond
        this.diamond = this.map.createFromObjects("Objects", {
            name: "diamond",
            key: "tilemap_sheet",
            frame: 67
        })
        this.physics.world.enable(this.diamond, Phaser.Physics.Arcade.STATIC_BODY);
        this.diamondGroup = this.add.group(this.diamond);

        //spike objects
        this.spike = this.map.createFromObjects("SpikeObjects", {
            name: "spike",
            key: "tilemap_sheet",
            frame: 68
        })
        this.physics.world.enable(this.spike, Phaser.Physics.Arcade.STATIC_BODY);
        this.spikeGroup = this.add.group(this.spike);
        
        //moving platform
        this.movingPlatforms = this.physics.add.group(); 
        this.tubeGroups = [];

        const movingPlatformObjects = this.map.createFromObjects("MovingPlatforms", {
            name: "" // or "platform" if you set a name in Tiled
        });

        movingPlatformObjects.forEach((obj) => {
            const x = obj.x;
            const y = obj.y;

            const tubeLeft = this.physics.add.sprite(x, y, 'left_tube');
            const tubeMid = this.physics.add.sprite(x + 16, y, 'mid_tube');
            const tubeRight = this.physics.add.sprite(x + 32, y, 'right_tube');

            [tubeLeft, tubeMid, tubeRight].forEach(part => {
                part.setImmovable(true);
                part.body.pushable = false;
                part.body.setAllowGravity(false);
                this.movingPlatforms.add(part);
            });

            const speed = Phaser.Math.Between(30, 70);
            const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;

            this.tubeGroups.push({
                parts: [tubeLeft, tubeMid, tubeRight],
                speed: speed * direction,
                minX: x - 100,
                maxX: x + 100
            });
        });

    }

    npc_creation(){
        this.npcGroup = this.add.group();

        // Different NPCs for each level
        const npcDataByLevel = {
            level1: [
                { x: 350, y: 0, key: 'npc1', dialog: ["Hey!", "Bring me Diamonds.",""], skin: "tile_0009.png", requiresItem: "diamond"},
                { x: 540, y: 0, key: 'npc2', dialog: ["Hello!", "Jump carefully.",""], skin: "tile_0006.png" },
                { x: 2315, y: 0, key: 'npc3', dialog: ["Woah", "You shouldn't be here.","This is too dangerous!",""], skin: "tile_0004.png" }
            ],
            level2: [
                { x: 150, y: 0, key: 'npc4', dialog: ["Woah", "Just Saying our level designer","Make this map more difficult","so good luck",""], skin: "tile_0004.png" },
                { x: 2200, y: 0, key: 'npc5', dialog: ["Hey!", "Bring me Diamonds.",""], skin: "tile_0009.png", requiresItem: "diamond"}
            ]
        };

        const npcData = npcDataByLevel[this.levelName] || [];

        this.npcDialogMap = {};
        this.npcItemGiven = {};
        this.inNpcZone = {};

        npcData.forEach(npcInfo => {
            const npc = this.physics.add.sprite(npcInfo.x, npcInfo.y, 'platformer_characters', npcInfo.skin);
            npc.setCollideWorldBounds(true);
            npc.name = npcInfo.key;
            npc.requiresItem = npcInfo.requiresItem || null;

            this.physics.add.collider(npc, this.groundLayer);
            this.npcGroup.add(npc);

            this.inNpcZone[npcInfo.key] = false;
            this.npcDialogMap[npcInfo.key] = { lines: npcInfo.dialog, index: 0 };
            this.npcItemGiven[npcInfo.key] = false;

            npc.interact = () => {
                const scene = this;
                const key = npc.name;
                const requiresItem = npc.requiresItem;
            
                scene.inDialogue = true;

                if (requiresItem && !scene.npcItemGiven[key]) {
                    const itemIndex = scene.inventory.indexOf(requiresItem);
                    if (itemIndex !== -1) {
                        scene.inventory.splice(itemIndex, 1);
                        scene.npcItemGiven[key] = true;
                        npc.setFrame("tile_0007.png");
                        scene.showNpcMessage(`${key}: Thanks for the ${requiresItem}!`, npc);
                        this.Dialogue.play();
                        scene.updateInventoryUI();
                        return;
                    } else {
                        scene.showNpcMessage(`${key}: Bring me a ${requiresItem}.`, npc);
                        this.Dialogue.play();
                        return;
                    }
                }

                const dialogState = scene.npcDialogMap[key];
                const currentLine = dialogState.lines[dialogState.index] || `${key}: Hello.`;
                scene.showNpcMessage(currentLine, npc);
                this.Dialogue.play();

                dialogState.index++;
                if (dialogState.index >= dialogState.lines.length) {
                    dialogState.index = 0;
                    scene.inDialogue = false;
                    scene.npcTextBox.setVisible(false);
                }
            };
        });
    }

    sfx(){
        this.collect = this.sound.add('collect',{volume: 0.2});
        this.Dialogue = this.sound.add('Dialogue',{volume: 0.05});
        this.ladderSound = this.sound.add('ladder', { volume: 0.5, loop: true });
        this.hurt = this.sound.add('hurt',{volume: 0.2});

    }
}