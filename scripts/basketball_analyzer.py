#!/usr/bin/env python3
"""
Basketball Analyzer Animation
A Matrix-style basketball made of 1s and 0s with live analysis effects
"""

import sys
import time
import random
import os
import math

# ANSI color codes
class Colors:
    ORANGE = '\033[38;5;208m'
    DARK_ORANGE = '\033[38;5;166m'
    BLACK = '\033[38;5;0m'
    GREEN = '\033[38;5;46m'
    DARK_GREEN = '\033[38;5;22m'
    YELLOW = '\033[38;5;226m'
    WHITE = '\033[38;5;255m'
    GRAY = '\033[38;5;240m'
    CYAN = '\033[38;5;51m'
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

# Basketball ASCII art pattern (1 = filled, 0 = empty, S = seam)
BASKETBALL_PATTERN = [
    "        1111111111        ",
    "      111111111111111      ",
    "    1111111S1111111111    ",
    "   111111S111S11111111   ",
    "  11111S11111S111111111  ",
    " 1111S111111111S1111111 ",
    " 111S1111111111S11111111 ",
    "111S111111111111S1111111",
    "11S11111111111111S111111",
    "1S1111111111111111S11111",
    "S111111111111111111S1111",
    "SSSSSSSSSSSSSSSSSSSSSSSS",
    "S111111111111111111S1111",
    "1S1111111111111111S11111",
    "11S11111111111111S111111",
    "111S111111111111S1111111",
    " 111S1111111111S11111111 ",
    " 1111S111111111S1111111 ",
    "  11111S11111S111111111  ",
    "   111111S111S11111111   ",
    "    1111111S1111111111    ",
    "      111111111111111      ",
    "        1111111111        ",
]

# Analysis messages that scroll by
ANALYSIS_MESSAGES = [
    "Analyzing pace metrics...",
    "Loading team statistics...",
    "Processing KenPom data...",
    "Calculating PPM thresholds...",
    "Scanning Golden Zone triggers...",
    "Evaluating defensive efficiency...",
    "Cross-referencing O/U lines...",
    "Running Monte Carlo simulation...",
    "Optimizing confidence scores...",
    "Fetching live odds data...",
    "Parsing ESPN box scores...",
    "Computing Free Throw Frenzy risk...",
    "Analyzing foul patterns...",
    "Building prediction matrix...",
    "Calibrating under triggers...",
    "Aggregating historical data...",
    "Processing 3,649 games...",
    "Training neural pathways...",
    "Validating model accuracy...",
    "Synchronizing databases...",
    "Encoding team tendencies...",
    "Mapping score trajectories...",
    "Calculating win probabilities...",
    "Streaming real-time updates...",
    "Compiling performance report...",
]

STATS_LABELS = [
    ("GAMES ANALYZED", lambda: random.randint(100, 9999)),
    ("WIN RATE", lambda: f"{random.uniform(55, 78):.1f}%"),
    ("AVG MARGIN", lambda: f"+{random.uniform(3, 12):.1f}"),
    ("TRIGGERS TODAY", lambda: random.randint(5, 45)),
    ("CONFIDENCE", lambda: f"{random.uniform(60, 95):.1f}%"),
    ("PPM THRESHOLD", lambda: f"{random.uniform(4.0, 5.5):.2f}"),
]


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


def move_cursor(row, col):
    print(f"\033[{row};{col}H", end="")


def hide_cursor():
    print("\033[?25l", end="")


def show_cursor():
    print("\033[?25h", end="")


def get_terminal_size():
    try:
        columns, rows = os.get_terminal_size()
        return rows, columns
    except:
        return 40, 120


def render_basketball(frame, matrix_rain):
    """Render the basketball with animated binary digits"""
    lines = []

    for row_idx, row in enumerate(BASKETBALL_PATTERN):
        line = ""
        for col_idx, char in enumerate(row):
            if char == ' ':
                # Matrix rain in background
                rain_char = matrix_rain.get((row_idx, col_idx), ' ')
                if rain_char != ' ':
                    brightness = random.choice([Colors.DARK_GREEN, Colors.GREEN, Colors.DARK_GREEN, Colors.DARK_GREEN])
                    line += f"{brightness}{rain_char}{Colors.RESET}"
                else:
                    line += ' '
            elif char == 'S':
                # Seam lines - black on orange or dark
                line += f"{Colors.BLACK}{'|' if random.random() > 0.3 else random.choice(['0', '1'])}{Colors.RESET}"
            else:
                # Basketball surface - animated 1s and 0s
                digit = random.choice(['0', '1'])
                # Pulsing effect based on frame
                pulse = math.sin(frame * 0.1 + row_idx * 0.2 + col_idx * 0.1)
                if pulse > 0.3:
                    color = Colors.ORANGE
                elif pulse > -0.3:
                    color = Colors.DARK_ORANGE
                else:
                    color = Colors.DARK_ORANGE
                line += f"{color}{digit}{Colors.RESET}"
        lines.append(line)

    return lines


def update_matrix_rain(matrix_rain, height, width, start_col):
    """Update the matrix rain effect in the background"""
    # Add new drops
    for col in range(width):
        if random.random() < 0.03:
            matrix_rain[(0, col)] = random.choice(['0', '1'])

    # Move existing drops down
    new_rain = {}
    for (row, col), char in matrix_rain.items():
        if row < height - 1:
            if random.random() < 0.7:  # Some drops fall faster
                new_rain[(row + 1, col)] = char
            else:
                new_rain[(row, col)] = char

    return new_rain


def render_stats_panel(frame, start_col):
    """Render the stats panel on the right side"""
    lines = []
    lines.append(f"{Colors.CYAN}{Colors.BOLD}╔══════════════════════════════╗{Colors.RESET}")
    lines.append(f"{Colors.CYAN}║{Colors.YELLOW}  GOLDEN ZONE ANALYZER v2.0  {Colors.CYAN}║{Colors.RESET}")
    lines.append(f"{Colors.CYAN}╠══════════════════════════════╣{Colors.RESET}")

    for label, value_fn in STATS_LABELS:
        value = value_fn()
        lines.append(f"{Colors.CYAN}║{Colors.RESET} {Colors.GRAY}{label:<14}{Colors.RESET} {Colors.GREEN}{str(value):>12}{Colors.RESET} {Colors.CYAN}║{Colors.RESET}")

    lines.append(f"{Colors.CYAN}╠══════════════════════════════╣{Colors.RESET}")
    lines.append(f"{Colors.CYAN}║{Colors.RESET} {Colors.WHITE}STATUS:{Colors.RESET} {Colors.GREEN}{'█' * ((frame // 3) % 10 + 1)}{Colors.GRAY}{'░' * (10 - (frame // 3) % 10 - 1)}{Colors.RESET} {Colors.CYAN}║{Colors.RESET}")
    lines.append(f"{Colors.CYAN}╚══════════════════════════════╝{Colors.RESET}")

    return lines


def render_message_log(frame, messages_shown):
    """Render scrolling analysis messages"""
    lines = []
    visible_messages = 5

    start_idx = (frame // 8) % len(ANALYSIS_MESSAGES)

    for i in range(visible_messages):
        idx = (start_idx + i) % len(ANALYSIS_MESSAGES)
        msg = ANALYSIS_MESSAGES[idx]

        if i == visible_messages - 1:
            # Latest message - bright and animated
            dots = '.' * ((frame % 12) // 4 + 1)
            msg = msg.rstrip('.') + dots
            lines.append(f"{Colors.GREEN}{Colors.BOLD}> {msg}{Colors.RESET}")
        elif i == visible_messages - 2:
            lines.append(f"{Colors.GREEN}> {msg}{Colors.RESET}")
        else:
            lines.append(f"{Colors.DARK_GREEN}> {msg}{Colors.RESET}")

    return lines


def render_header():
    """Render the header"""
    return [
        f"{Colors.YELLOW}{Colors.BOLD}",
        "  ████████╗ █████╗ ██╗  ██╗███████╗    ████████╗██╗  ██╗███████╗",
        "  ╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝    ╚══██╔══╝██║  ██║██╔════╝",
        "     ██║   ███████║█████╔╝ █████╗         ██║   ███████║█████╗  ",
        "     ██║   ██╔══██║██╔═██╗ ██╔══╝         ██║   ██╔══██║██╔══╝  ",
        "     ██║   ██║  ██║██║  ██╗███████╗       ██║   ██║  ██║███████╗",
        "     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝       ╚═╝   ╚═╝  ╚═╝╚══════╝",
        "",
        "  ██╗     ██╗██╗   ██╗███████╗    ██╗   ██╗███╗   ██╗██████╗ ███████╗██████╗ ",
        "  ██║     ██║██║   ██║██╔════╝    ██║   ██║████╗  ██║██╔══██╗██╔════╝██╔══██╗",
        "  ██║     ██║██║   ██║█████╗      ██║   ██║██╔██╗ ██║██║  ██║█████╗  ██████╔╝",
        "  ██║     ██║╚██╗ ██╔╝██╔══╝      ██║   ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗",
        "  ███████╗██║ ╚████╔╝ ███████╗    ╚██████╔╝██║ ╚████║██████╔╝███████╗██║  ██║",
        "  ╚══════╝╚═╝  ╚═══╝  ╚══════╝     ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝",
        f"{Colors.RESET}",
        "",
    ]


def main():
    try:
        hide_cursor()
        clear_screen()

        matrix_rain = {}
        frame = 0
        messages_shown = []

        rows, cols = get_terminal_size()

        print(f"{Colors.GREEN}Initializing Golden Zone Analyzer...{Colors.RESET}")
        time.sleep(0.5)

        while True:
            clear_screen()

            # Render header
            header = render_header()
            for line in header:
                print(line)

            header_height = len(header)

            # Calculate positions
            basketball_width = len(BASKETBALL_PATTERN[0])
            stats_width = 34

            # Render basketball
            basketball = render_basketball(frame, matrix_rain)
            stats = render_stats_panel(frame, 0)
            messages = render_message_log(frame, messages_shown)

            # Print basketball and stats side by side
            max_lines = max(len(basketball), len(stats))

            for i in range(max_lines):
                bb_line = basketball[i] if i < len(basketball) else " " * basketball_width
                stats_line = stats[i] if i < len(stats) else ""

                # Add spacing between basketball and stats
                print(f"    {bb_line}      {stats_line}")

            # Print message log
            print()
            print(f"  {Colors.CYAN}{'─' * 60}{Colors.RESET}")
            print(f"  {Colors.CYAN}{Colors.BOLD}ANALYSIS LOG:{Colors.RESET}")
            for msg in messages:
                print(f"    {msg}")

            # Print footer
            print()
            print(f"  {Colors.GRAY}Press Ctrl+C to exit{Colors.RESET}")

            # Update animation state
            matrix_rain = update_matrix_rain(matrix_rain, len(BASKETBALL_PATTERN), basketball_width, 0)
            frame += 1

            time.sleep(0.08)

    except KeyboardInterrupt:
        clear_screen()
        print(f"\n{Colors.YELLOW}Golden Zone Analyzer shutting down...{Colors.RESET}")
        print(f"{Colors.GREEN}Analysis complete. Go take the live under!{Colors.RESET}\n")
    finally:
        show_cursor()


if __name__ == "__main__":
    main()
