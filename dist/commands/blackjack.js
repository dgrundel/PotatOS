const faces = {
    11: 'J',
    12: 'Q',
    13: 'K',
    14: 'A'
};
const suits = ['H', 'D', 'S', 'C'];
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
const menu = (cli, prompt, options, def) => {
    const loop = () => cli.readln(prompt)
        .then(input => {
        if (options.hasOwnProperty(input)) {
            return options[input].call(undefined);
        }
        else {
            return def ? def() : loop();
        }
    });
    return loop();
};
const game = async (context) => new Promise(exit => {
    const { cli } = context;
    const deck = shuffle(sortedDeck);
    let dealerSum = 0;
    const dealerHand = [];
    while (dealerSum < 17) {
        const draw = deck.pop();
        dealerHand.push(draw);
        dealerSum = calcHand(dealerHand);
    }
    const playerHand = [
        deck.pop(),
        deck.pop()
    ];
    const endGame = async () => {
        const playerSum = calcHand(playerHand);
        if (dealerSum > BLACKJACK) {
            cli.println('Dealer busts! You win!');
        }
        else if (playerSum > BLACKJACK) {
            cli.println('You busted! Dealer wins.');
        }
        else if (playerSum > dealerSum) {
            cli.println('You win!');
        }
        else {
            cli.println('You lost.');
        }
        menu(cli, 'Play again? (y/n)', {
            y: async () => game(context).then(exit),
            n: async () => exit()
        });
    };
    const loop = async () => {
        cli.println(`\nDealer has ${printHand(dealerHand)}.`);
        cli.println(`You have ${printHand(playerHand)}.\n`);
        const playerSum = calcHand(playerHand);
        if (dealerSum > BLACKJACK || playerSum > BLACKJACK || playerSum > dealerSum) {
            endGame();
        }
        else {
            menu(cli, '(h)it, (s)tay, or (q)uit?', {
                h: async () => {
                    playerHand.push(deck.pop());
                    loop();
                },
                s: async () => endGame(),
                q: async () => exit(),
            });
        }
    };
    loop();
});
export const BlackjackExecutor = {
    shortDescription: 'Play a game of Blackjack, no chips required',
    invoke: async (context) => {
        return game(context).then(() => 0);
    }
};
