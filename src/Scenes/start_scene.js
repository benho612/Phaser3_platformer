class start_scene extends Phaser.Scene {
    constructor() {
        super("start_scene"); 
    }

    preload() {
        this.load.setPath("./assets/");
    }

    create() {
        this.centerX = this.scale.width / 2;
        this.centerY = this.scale.height / 2;

        // Title
        this.title = this.add.text(this.centerX, this.centerY - 100, "🍄 Platformer Game 🍄", {
            fontSize: "40px",
            color: "#ffffff",
            fontFamily: "PixelFont",
            stroke: "#000000",
            strokeThickness: 5
        }).setOrigin(0.5);

        // Start Game Button
        this.startButton = this.add.text(this.centerX, this.centerY, "Start Game", {
            fontSize: "28px",
            backgroundColor: "#222",
            color: "#fff",
            fontFamily: "PixelFont",
            padding: { x: 20, y: 10 },
            align: "center"
        }).setOrigin(0.5).setInteractive();

        this.startButton.on("pointerover", () => this.startButton.setStyle({ fill: "#ffff00" }));
        this.startButton.on("pointerout", () => this.startButton.setStyle({ fill: "#ffffff" }));
        this.startButton.on("pointerdown", () => {
            this.scene.start("game_scene");
        });

        // Optional instructions
        this.instruction = this.add.text(this.centerX, this.centerY + 100, "Use WAD to move. Reach the flag to win!", {
            fontSize: "16px",
            fontFamily: "PixelFont",
            color: "#cccccc",
        }).setOrigin(0.5);
    }

    update(){
        
        this.centerX = this.scale.width / 2;
        this.centerY = this.scale.height / 2;

        this.title.setPosition(this.centerX, this.centerY - 100); 

        this.startButton.setPosition(this.centerX, this.centerY);

        this.instruction.setPosition(this.centerX,this.centerY+100);

    }

}
