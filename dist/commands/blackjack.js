const TITLE = `
▀██▀▀█▄   ▀██                  ▀██         ██                 ▀██      
 ██   ██   ██   ▄▄▄▄     ▄▄▄▄   ██  ▄▄    ▄▄▄  ▄▄▄▄     ▄▄▄▄   ██  ▄▄  
 ██▀▀▀█▄   ██  ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀      ██ ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀   
 ██    ██  ██  ▄█▀ ██  ██       ██▀█▄      ██ ▄█▀ ██  ██       ██▀█▄   
▄██▄▄▄█▀  ▄██▄ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄    ██ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄ 
                                        ▄▄ █▀                          
                                         ▀▀                            
`;
const DIVIDER = '════════════════════════════╡ ♥♦♠♣ ╞════════════════════════════';
const suits = ['♥', '♦', '♠', '♣'];
const sortedDeck = suits.map(suit => {
    return [
        2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'
    ].map(display => ({
        suit,
        display: display.toString(),
        value: typeof display === 'number' ? display : (display === 'A' ? 1 : 10)
    }));
}).reduce((all, cards) => all.concat(cards), []);
const shuffle = (cards) => {
    const shuffler = () => 0.5 - Math.random();
    const shuffled = cards.slice();
    shuffled.sort(shuffler);
    shuffled.sort(shuffler);
    shuffled.sort(shuffler);
    return shuffled;
};
const BLACKJACK = 21;
const calcHand = (cards) => {
    let aces = 0;
    let sum = 0;
    cards.forEach(c => {
        sum += c.value;
        aces += (c.display === 'A' ? 1 : 0);
    });
    while (aces-- && (sum + 10) <= BLACKJACK) {
        sum += 10;
    }
    return sum;
};
const printHand = (cards) => {
    const sum = calcHand(cards);
    const list = cards.map(c => `${c.display}${c.suit}`).join(', ');
    return `${list} (${sum})`;
};
const menu = (cli, prompt, options, defaultOption, inputModifier) => {
    const loop = () => cli.readln(prompt)
        .then(input => inputModifier ? inputModifier(input) : input)
        .then(input => {
        if (options.hasOwnProperty(input)) {
            return options[input].call(undefined);
        }
        else {
            return defaultOption ? defaultOption() : loop();
        }
    });
    return loop();
};
const game = async (context) => new Promise(exit => {
    const { cli } = context;
    cli.println(DIVIDER);
    const deck = shuffle(sortedDeck);
    const dealerHand = [
        deck.pop(),
        deck.pop()
    ];
    const playerHand = [
        deck.pop(),
        deck.pop()
    ];
    const endGame = () => {
        const playerSum = calcHand(playerHand);
        const dealerSum = calcHand(dealerHand);
        if (dealerSum > BLACKJACK) {
            cli.println('Dealer busts! You win!');
        }
        else if (playerSum > BLACKJACK) {
            cli.println('You busted! Dealer wins.');
        }
        else if (playerSum === dealerSum) {
            cli.println('Push.');
        }
        else if (playerSum > dealerSum) {
            cli.println('You win!');
        }
        else {
            cli.println('You lost.');
        }
        menu(cli, 'Play again? (Y/N)', {
            Y: async () => game(context).then(exit),
            N: async () => exit()
        }, undefined, s => s.toUpperCase());
    };
    const stay = () => {
        cli.println(`Dealer has ${printHand(dealerHand)}.`);
        cli.println(`You have ${printHand(playerHand)}.\n`);
        const dealerSum = calcHand(dealerHand);
        if (dealerSum >= 17) {
            endGame();
        }
        else {
            cli.println(`Dealer hits.\n`);
            dealerHand.push(deck.pop());
            // add a little delay
            setTimeout(stay, 1200);
        }
    };
    const loop = () => {
        // before player stays, they can only see the first card drawn by dealer
        const dealerVisible = dealerHand.slice(0, 1);
        cli.println(`Dealer has ${printHand(dealerVisible)} visible.`);
        cli.println(`You have ${printHand(playerHand)}.\n`);
        const playerSum = calcHand(playerHand);
        if (playerSum === BLACKJACK) {
            stay();
        }
        else if (playerSum > BLACKJACK) {
            endGame();
        }
        else {
            menu(cli, '(H)it, (S)tay, or (Q)uit?', {
                H: async () => {
                    playerHand.push(deck.pop());
                    loop();
                },
                S: async () => stay(),
                Q: async () => exit(),
            }, undefined, s => s.toUpperCase());
        }
    };
    loop();
});
export const BlackjackExecutor = {
    shortDescription: 'Play a game of Blackjack, no chips required',
    invoke: async (context) => {
        const { cli } = context;
        cli.println(TITLE);
        return game(context).then(() => {
            cli.println(DIVIDER);
            cli.println('Thanks for playing!');
            return 0;
        });
    }
};
