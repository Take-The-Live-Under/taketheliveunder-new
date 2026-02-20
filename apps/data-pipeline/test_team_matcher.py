"""
Test script for NCAA team name matching
"""
from utils.team_name_matcher import get_team_matcher

def test_team_matching():
    """Test various team name matching scenarios"""
    matcher = get_team_matcher()

    # Test cases: (name1, name2, should_match)
    test_cases = [
        # Exact matches
        ("Duke", "Duke", True),
        ("North Carolina", "North Carolina", True),

        # Mascot variations
        ("Duke Blue Devils", "Duke", True),
        ("North Carolina Tar Heels", "UNC", True),
        ("Kentucky Wildcats", "Kentucky", True),

        # Abbreviations
        ("UNC", "North Carolina", True),
        ("UCLA", "UCLA Bruins", True),
        ("LSU", "Louisiana State", True),
        ("VCU", "Virginia Commonwealth", True),

        # St./Saint variations
        ("St. John's", "Saint Johns", True),
        ("St. Mary's", "Saint Marys", True),

        # State variations
        ("Michigan State", "Michigan St", True),
        ("Ohio State", "Ohio St", True),
        ("Florida State", "Florida St", True),

        # Special cases
        ("Texas A&M", "Texas AM", True),
        ("Miami (FL)", "Miami", True),
        ("SMU", "Southern Methodist", True),
        ("TCU", "Texas Christian", True),
        ("BYU", "Brigham Young", True),

        # Should NOT match
        ("Duke", "North Carolina", False),
        ("Michigan", "Michigan State", False),
        ("USC", "South Carolina", False),  # Different teams
    ]

    print("Testing team name matching...")
    print("=" * 80)

    passed = 0
    failed = 0

    for name1, name2, expected in test_cases:
        result = matcher.match_teams(name1, name2)
        status = "✓" if result == expected else "✗"

        if result == expected:
            passed += 1
        else:
            failed += 1

        print(f"{status} '{name1}' vs '{name2}' -> {result} (expected {expected})")

    print("=" * 80)
    print(f"Results: {passed} passed, {failed} failed")

    return failed == 0


if __name__ == "__main__":
    success = test_team_matching()
    exit(0 if success else 1)
