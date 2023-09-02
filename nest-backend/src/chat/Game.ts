export class GameClass {
  private ballPosition: { x: number; y: number };
  private player1PaddlePosition: number;
  private player2PaddlePosition: number;
  private paddleSpeed: number; // la vitesse de déplacement des palettes
  private ballSpeed: { x: number; y: number }; // la vitesse de la balle
  private player1Score: number;
  private player2Score: number;
  private ballVisible: boolean;
  private visibilityCount: number;
  private invisibleGameplay: boolean;

  constructor(gameplayStyle: string) {
    // Initialisez les positions de départ de la balle et des palettes
    this.ballPosition = { x: 50, y: 50 };
    this.player1PaddlePosition = 50;
    this.player2PaddlePosition = 50;
    this.paddleSpeed = 4;
    this.ballVisible = true;
    this.visibilityCount = 0;
    this.invisibleGameplay = (gameplayStyle === 'invisible');

    // Vérifiez le gameplayStyle pour déterminer la vitesse initiale de la balle
    if (gameplayStyle === 'slow') {
      this.ballSpeed = { x: 0.2, y: 0.2 };
    }
    else {
      // Default speed
      this.ballSpeed = { x: 0.4, y: 0.4 };
    }

    this.player1Score = 0;
    this.player2Score = 0;
  }

  update() {
    if (this.invisibleGameplay) {
      this.visibilityCount += 1;

      if (this.visibilityCount >= 300) {
        this.ballVisible = !this.ballVisible;
        this.visibilityCount = 0;
      }

      if (!this.ballVisible && this.visibilityCount >= 60) {
        this.ballVisible = true;
        this.visibilityCount = 0;
      }
    }

    // Update ball position
    this.ballPosition.x += this.ballSpeed.x;
    this.ballPosition.y += this.ballSpeed.y;

    if (this.ballPosition.y <= 0 || this.ballPosition.y >= 100) {
      // The ball is at the edge of the screen, reverse its y direction
      this.ballSpeed.y *= -1;
    }
    // Check collisions between the ball and the paddles
    if (this.ballPosition.x <= 1) { // 1 being the width of the paddle
      if (this.ballPosition.y >= this.player1PaddlePosition &&
        this.ballPosition.y <= this.player1PaddlePosition + 15) { // 15 being the height of the paddle
        // The ball hits player 1's paddle, reverse its x direction
        this.ballSpeed.x *= -1;

        // Adjust the y speed based on where the ball hit the paddle
        const hitPosition = (this.ballPosition.y - this.player1PaddlePosition) / 15;
        this.ballSpeed.y += (hitPosition - 0.5) * 2; // This will add a value between -1 and 1 to the y speed

        // Add some acceleration to the ball
        this.ballSpeed.x *= 1.05;
        this.ballSpeed.y *= 1.05;

        const maxYSpeed = Math.abs(this.ballSpeed.x) * 0.5;  // 0.5 is a ratio, adjust this value as you see fit
        if (Math.abs(this.ballSpeed.y) > maxYSpeed) {
          this.ballSpeed.y = maxYSpeed * (this.ballSpeed.y > 0 ? 1 : -1);
        }
      } else {
        // The ball did not hit the paddle, player 2 scores a point
        this.player2Score += 1;
        this.resetBall();
      }
    } else if (this.ballPosition.x >= 99) { // 99 = 100 - 1, 1 being the width of the paddle
      if (this.ballPosition.y >= this.player2PaddlePosition &&
        this.ballPosition.y <= this.player2PaddlePosition + 15) { // 15 being the height of the paddle
        // The ball hits player 2's paddle, reverse its x direction
        this.ballSpeed.x *= -1;

        // Adjust the y speed based on where the ball hit the paddle
        const hitPosition = (this.ballPosition.y - this.player2PaddlePosition) / 15;
        this.ballSpeed.y += Math.abs(hitPosition - 0.5) * 2; // This will add a value between -1 and 1 to the y speed

        // Add some acceleration to the ball
        this.ballSpeed.x *= 1.05;
        this.ballSpeed.y *= 1.05;
      } else {
        // The ball did not hit the paddle, player 1 scores a point
        this.player1Score += 1;
        this.resetBall();
      }
    }
  }

  resetBall() {
    this.visibilityCount = 0;
    // Réinitialise la position de la balle au centre du terrain
    this.ballPosition = { x: 50, y: 50 }; // Supposons que la largeur du terrain est 100
  }


  getState() {
    // Retourne l'état actuel du jeu
    return {
      ballPosition: this.ballVisible ? this.ballPosition : { x: -1000, y: -1000 },
      player1PaddlePosition: this.player1PaddlePosition,
      player2PaddlePosition: this.player2PaddlePosition,
      player1Score: this.player1Score,
      player2Score: this.player2Score,
    };
  }

  // Vous pouvez également ajouter des méthodes pour gérer les entrées des joueurs, par exemple :
  player1Move(direction: 'up' | 'down') {
    // Mettez à jour la position de la palette du joueur 1 en fonction de la direction
    if (direction === 'up') {
      this.player1PaddlePosition = Math.max(0, this.player1PaddlePosition - this.paddleSpeed);
    } else {
      this.player1PaddlePosition = Math.min(100 - 15, this.player1PaddlePosition + this.paddleSpeed);  // 15 being the height of the paddle
    }
  }

  player2Move(direction: 'up' | 'down') {
    // Mettez à jour la position de la palette du joueur 2 en fonction de la direction
    if (direction === 'up') {
      this.player2PaddlePosition = Math.max(0, this.player2PaddlePosition - this.paddleSpeed);
    } else {
      this.player2PaddlePosition = Math.min(100 - 15, this.player2PaddlePosition + this.paddleSpeed);  // 15 being the height of the paddle
    }
  }

  getWinner() {
    if (this.player1Score >= 3) {
      return 1;
    } else if (this.player2Score >= 3) {
      return 2;
    } else {
      return null;
    }
  }
}