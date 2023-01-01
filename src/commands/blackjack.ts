import { CLI } from '../CLI';
import { CommandContext, CommandExecutor } from '../command';
import { Formatter } from '../Formatter';

const TITLE = `
▀██▀▀█▄   ▀██                  ▀██       ██                 ▀██      
 ██   ██   ██   ▄▄▄▄     ▄▄▄▄   ██  ▄▄  ▄▄▄  ▄▄▄▄     ▄▄▄▄   ██  ▄▄  
 ██▀▀▀█▄   ██  ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀    ██ ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀   
 ██    ██  ██  ▄█▀ ██  ██       ██▀█▄    ██ ▄█▀ ██  ██       ██▀█▄   
▄██▄▄▄█▀  ▄██▄ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄  ██ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄ 
                                      ▄▄ █▀                          
                                       ▀▀                            `;
const DIVIDER = '════════════════════════════╡ ♥♦♠♣ ╞════════════════════════════';

type Suit = '♥'|'♦'|'♠'|'♣';
interface Card {
    suit: Suit;
    display: string;
    value: number;
}

const HIDDEN_CARD: Card = {
    suit: '♠',
    display: '?',
    value: 0
};

const SUITS: Suit[] = ['♥', '♦', '♠', '♣'];

const sortedDeck = SUITS.map(suit => {
    return [
        2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'
    ].map(display => ({ 
        suit, 
        display: display.toString(), 
        value: typeof display === 'number' ? display : (display === 'A' ? 1 : 10)
    }));
}).reduce((all: Card[], cards: Card[]) => all.concat(cards), []);

const shuffle = (cards: Card[]): Card[] => {
    const shuffler = () => 0.5 - Math.random();
    const shuffled = cards.slice();
    shuffled.sort(shuffler);
    shuffled.sort(shuffler);
    shuffled.sort(shuffler);
    return shuffled;
};

const BLACKJACK = 21;

const calcHand = (cards: Card[]): number => {
    let aces = 0;
    let sum = 0;
    cards.forEach(c => {
        sum += c.value;
        aces += (c.display === 'A' ? 1 : 0)
    });

    while (aces-- && (sum + 10) <= BLACKJACK) {
        sum += 10;
    }

    return sum;
}

const printHand = (cards: Card[]): string => {
    const gap = ' ';
    const lines: string[] = [
        cards.map(c => `╭─────╮`).join(gap),
        cards.map(c => c.display === '?' ? '│░░░░░│' : `│${Formatter.pad(c.display, 2)}   │`).join(gap),
        cards.map(c => c.display === '?' ? '│░░░░░│' : `│  ${c.suit}  │`).join(gap),
        cards.map(c => c.display === '?' ? '│░░░░░│' : `│     │`).join(gap),
        cards.map(c => `╰─────╯`).join(gap)
    ];
    return lines.join('\n');
};

const menu = (
    cli: CLI,
    prompt: string,
    options: Record<string, () => Promise<void>>,
    defaultOption?: () => Promise<void>,
    inputModifier?: (s: string) => string
): Promise<void> => {
    const loop = (): Promise<void> => cli.readln(prompt)
        .then(input => inputModifier ? inputModifier(input) : input)
        .then(input => {
            if (options.hasOwnProperty(input)) {
                return options[input].call(undefined);
            } else {
                return defaultOption ? defaultOption() : loop();
            }
        });
    return loop();
}

const game = async (context: CommandContext) => new Promise<void>(exit => {
    const { cli } = context;

    cli.println(DIVIDER);

    const deck = shuffle(sortedDeck);

    const dealerHand: Card[] = [
        deck.pop()!,
        deck.pop()!
    ];

    const playerHand: Card[] = [
        deck.pop()!,
        deck.pop()!
    ];

    const endGame = () => {
        const dealerSum = calcHand(dealerHand);
        const playerSum = calcHand(playerHand);

        if (dealerSum > BLACKJACK) {
            cli.println('Dealer busts! You win!');
        } else if (playerSum > BLACKJACK) {
            cli.println('You busted! Dealer wins.');

        } else if (playerSum === dealerSum) {
            cli.println('Push.');

        } else if (playerSum > dealerSum) {
            cli.println('You win!');

        } else {
            cli.println('You lost.');
        }

        menu(cli, 'Play again? (Y/N)', {
            Y: async () => game(context).then(exit),
            N: async () => exit()
        }, undefined, s => s.toUpperCase());
    };

    const stay = () => {
        const dealerSum = calcHand(dealerHand);
        const playerSum = calcHand(playerHand);
        
        cli.println(`Dealer hand (${dealerSum}):\n${printHand(dealerHand)}`);
        cli.println(`Your hand (${playerSum}):\n${printHand(playerHand)}\n`);

        if (dealerSum >= 17) {
            endGame();

        } else {
            cli.println(`Dealer hits.\n`);
            dealerHand.push(deck.pop()!);
            
            // add a little delay
            setTimeout(stay, 1200);
        }
    };

    const loop = () => {
        // before player stays, they can only see the first card drawn by dealer
        const dealerVisible = dealerHand.slice(0, 1).concat(HIDDEN_CARD);
        const dealerSum = calcHand(dealerVisible);
        const playerSum = calcHand(playerHand);
        
        cli.println(`Dealer hand (${dealerSum}):\n${printHand(dealerVisible)}`);
        cli.println(`Your hand (${playerSum}):\n${printHand(playerHand)}\n`);

        if (playerSum === BLACKJACK) {
            stay();

        } else if (playerSum > BLACKJACK) {
            endGame();

        } else {
            menu(cli, '(H)it, (S)tay, or (Q)uit?', {
                H: async () => {
                    playerHand.push(deck.pop()!);
                    loop();
                },
                S: async () => stay(),
                Q: async () => exit(),
            }, undefined, s => s.toUpperCase());
        }
    };

    loop();
});

export const BlackjackExecutor: CommandExecutor = {
    shortDescription: 'Play a game of Blackjack, no chips required',
    invoke: async context => {
        const { cli } = context;
        cli.println(TITLE);

        return game(context).then(() => {
            cli.println(DIVIDER);
            cli.println('Thanks for playing!');

            return 0;
        });
    }
};