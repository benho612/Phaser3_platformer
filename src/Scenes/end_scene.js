class end_scene extends Phaser.Scene {
    constructor() {
        super("end_scene");
    }

    init(data)
    {
        this.score = data.score || 0;
    }
    create() {
        let resultText = "Game Over";
        if (this.result === "completed") {
            resultText = "Level Completed!";
        } else if (this.result === "failed") {
            resultText = "Level Failed!";
        }

        this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, resultText, {
            fontSize: "36px",
            fill: "#ffffff",
            fontFamily: "PixelFont"
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2, `Score: ${this.score}`, {
            fontSize: "24px",
            fill: "#ffffff",
            fontFamily: "PixelFont"            
        }).setOrigin(0.5);

        // Restart Button
        this.restartButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, "Restart", {
            fontSize: "24px",
            backgroundColor: "#000000",
            color: "#ffffff",
            fontFamily: "PixelFont",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        this.restartButton.on("pointerdown", () => {
            this.scene.start("game_scene");
        });

        // Return to Menu Button
        this.menuButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 110, "Main Menu", {
            fontSize: "24px",
            backgroundColor: "#000000",
            color: "#ffffff",
            fontFamily: "PixelFont",            
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        this.menuButton.on("pointerdown", () => {
            this.scene.start("start_scene");  // replace with your actual menu scene key
        });


        this.menuButton.on("pointerover", () => this.menuButton.setStyle({ fill: "#ffff00" }));
        this.menuButton.on("pointerout", () => this.menuButton.setStyle({ fill: "#ffffff" }));

        this.restartButton.on("pointerover", () => this.restartButton.setStyle({ fill: "#ffff00" }));
        this.restartButton.on("pointerout", () => this.restartButton.setStyle({ fill: "#ffffff" }));
    }

    

}