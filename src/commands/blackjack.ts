import { CLI } from '../CLI';
import { CommandContext, CommandExecutor } from '../command';

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

type Suit = '♥'|'♦'|'♠'|'♣';
interface Card {
    suit: Suit;
    display: string;
    value: number;
}

const suits: Suit[] = ['♥', '♦', '♠', '♣'];

const sortedDeck = suits.map(suit => {
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
    const sum = calcHand(cards);
    const list = cards.map(c => `${c.display}${c.suit}`).join(', ');
    return `${list} (${sum})`;
};

const menu = (
    cli: CLI,
    prompt: string,
    options: Record<string, () => Promise<void>>,
    def?: () => Promise<void>
): Promise<void> => {
    const loop = (): Promise<void> => cli.readln(prompt)
        .then(input => {
            if (options.hasOwnProperty(input)) {
                return options[input].call(undefined);
            } else {
                return def ? def() : loop();
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
        const playerSum = calcHand(playerHand);
        const dealerSum = calcHand(dealerHand);

        if (dealerSum > BLACKJACK) {
            cli.println('Dealer busts! You win!');
        } else if (playerSum > BLACKJACK) {
            cli.println('You busted! Dealer wins.');

        } else if (playerSum > dealerSum) {
            cli.println('You win!');

        } else {
            cli.println('You lost.');
        }

        menu(cli, 'Play again? (y/n)', {
            y: async () => game(context).then(exit),
            n: async () => exit()
        });
    };

    const stay = () => {
        cli.println(`\nDealer has ${printHand(dealerHand)}.`);
        cli.println(`You have ${printHand(playerHand)}.\n`);

        const dealerSum = calcHand(dealerHand);
        if (dealerSum >= 17) {
            endGame();

        } else {
            cli.println(`Dealer hits.`);
            dealerHand.push(deck.pop()!);
            
            // add a little delay
            setTimeout(stay, 1200);
        }
    };

    const loop = () => {
        // before player stays, they can only see the first card drawn by dealer
        const dealerVisible = dealerHand.slice(0, 1);
        
        cli.println(`\nDealer has ${printHand(dealerVisible)} visible.`);
        cli.println(`You have ${printHand(playerHand)}.\n`);

        const playerSum = calcHand(playerHand);

        if (playerSum >= BLACKJACK) {
            stay();

        } else {
            menu(cli, '(h)it, (s)tay, or (q)uit?', {
                h: async () => {
                    playerHand.push(deck.pop()!);
                    loop();
                },
                s: async () => stay(),
                q: async () => exit(),
            });
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