# Social action catalog at the source pin

Generated from authored actions and the actual normalization helpers. These are base Normal-mode costs for one target, not a promise that every action is enabled in Teamplay. Dynamic modifiers and multi-target costs remain part of the runtime contract. Full descriptions, effects, phases, flags and group prices are preserved in social-actions.json.

| ID                    | Action                     | Energy | Influence | Info | Influence yield | Info yield | Team-stage review                   |
| --------------------- | -------------------------- | -----: | --------: | ---: | --------------: | ---------: | ----------------------------------- |
| compliment            | Compliment                 |      1 |         0 |    0 |               2 |          0 | Requires tribe target validation    |
| whisper               | Whisper                    |      1 |         0 |    0 |               0 |        100 | Requires tribe target validation    |
| observe               | Watch Room                 |      1 |         0 |    0 |               0 |        100 | Requires tribe target validation    |
| group_chat            | Group Chat                 |      2 |         0 |    0 |               3 |          0 | Requires tribe target validation    |
| build_quiet_bond      | Heart-to-Heart             |      2 |         0 |    0 |               4 |          0 | Requires tribe target validation    |
| share_personal_story  | Open Up                    |      2 |         0 |    0 |               3 |          0 | Requires tribe target validation    |
| read_the_room         | Read the Room              |      1 |         0 |    0 |               0 |        100 | AI shim: audit caller legality      |
| proposeAlliance       | Propose Personal Pact      |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| consult_alliance      | Consult Alliance           |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| protect               | Offer Protection           |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| betray                | Betray Ally                |      3 |         0 |    0 |               4 |          0 | Requires tribe target validation    |
| reassure              | Reassure                   |      1 |         0 |    0 |               3 |          0 | Requires tribe target validation    |
| apologize             | Clear the Air              |      1 |         0 |    0 |               2 |          0 | Requires tribe target validation    |
| share_intel           | Share Intel                |      1 |         0 |  200 |               6 |          0 | Requires tribe target validation    |
| rumor                 | Spread Rumor               |      2 |         0 |  100 |               5 |          0 | Requires tribe target validation    |
| startFight            | Start Fight                |      3 |         0 |    0 |               4 |          0 | Requires tribe target validation    |
| confront              | Confront                   |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| favor_request         | Request Favour             |      1 |        20 |    0 |               3 |          0 | Requires tribe target validation    |
| pitch_target          | Pitch Target               |      2 |        10 |  100 |               4 |          0 | Individual-stage only until adapted |
| suggest_replacement   | Suggest Replacement        |      2 |        10 |  100 |               4 |          0 | Individual-stage only until adapted |
| ask_use_safety        | Ask to Use Safety          |      2 |        10 |    0 |               0 |          0 | Individual-stage only until adapted |
| ask_safety_plan       | Ask Safety Plan            |      1 |         0 |    0 |               0 |          0 | Individual-stage only until adapted |
| ask_hold_safety       | Respect Nominations        |      2 |        10 |    0 |               0 |          0 | Individual-stage only until adapted |
| warn_about_danger     | Warn About Danger          |      1 |         0 |  100 |               0 |          0 | Requires tribe target validation    |
| ask_nemesis_reason    | Why Betray Me?             |      1 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| ask_why_nominated     | Ask Why You Were Nominated |      1 |         0 |    0 |               0 |          0 | Individual-stage only until adapted |
| ask_loh_target        | Ask LOH Target             |      1 |         0 |    0 |               0 |        100 | Individual-stage only until adapted |
| ask_nomination_advice | Ask for Nomination Advice  |      0 |         3 |    0 |               0 |         25 | Individual-stage only until adapted |
| ask_player_opinion    | Ask About a Player         |      1 |         2 |    0 |               0 |         50 | Requires tribe target validation    |
| warn_about_player     | Warn About Player          |      1 |         0 |  100 |               2 |          0 | Requires tribe target validation    |
| rally_votes_against   | Rally Votes Against        |      2 |        20 |    0 |               3 |          0 | Individual-stage only until adapted |
| flirt                 | Test the Spark             |      2 |         0 |    0 |               2 |          0 | Requires tribe target validation    |
| private_flirt         | Flirt in Private           |      1 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| late_night_talk       | Late-Night Talk            |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| cuddle                | Cuddle                     |      1 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| kiss_under_covers     | Secret Kiss                |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| pool_makeout          | Pool Makeout               |      3 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| spend_night           | Spend the Night            |      4 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| try_for_baby          | Try for a Baby             |      3 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| pregnancy_test        | Ask for Pregnancy Test     |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| pregnancy_test_self   | Take Pregnancy Test        |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| share_pregnancy_news  | Share Pregnancy News       |      1 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| paternity_test_self   | Take Paternity Test        |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| go_public             | Go Public                  |      3 |        10 |    0 |               0 |          0 | Requires tribe target validation    |
| end_romance           | End It                     |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| break_alliance        | Break the Alliance         |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| snoop_around          | Snoop Around               |      2 |         0 |    0 |               0 |        200 | Requires tribe target validation    |
| ride_or_die           | Make a Pact                |      3 |        10 |    0 |               4 |          0 | Requires tribe target validation    |
| risk_the_vibe         | Risk the Vibe              |      2 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| break_bromance        | End the Ride-or-Die        |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
| plant_lie             | Plant a Lie                |      3 |         0 |  200 |               5 |          0 | Requires tribe target validation    |
| trade_secrets         | Trade Secrets              |      2 |         0 |  100 |               5 |         50 | Requires tribe target validation    |
| eavesdrop             | Eavesdrop                  |      2 |         0 |    0 |               0 |        200 | Requires tribe target validation    |
| expose_secret         | Expose a Secret            |      4 |         0 |  300 |               6 |          0 | Requires tribe target validation    |
| stir_rivalry          | Pit Them Against           |      3 |        10 |  100 |               4 |          0 | Requires tribe target validation    |
| public_callout        | Call Them Out              |      4 |        10 |    0 |               0 |          0 | Requires tribe target validation    |
| repair_bond           | Private Truce              |      2 |         0 |    0 |               2 |          0 | Requires tribe target validation    |
| ally                  | Form Alliance              |      3 |         0 |    0 |               0 |          0 | AI shim: audit caller legality      |
| nominate              | Nominate Player            |      1 |         0 |    0 |               0 |          0 | AI shim: audit caller legality      |
| vote_rally            | Vote Rally                 |      2 |        50 |    0 |               4 |          0 | AI shim: audit caller legality      |
| idle                  | Lay Low                    |      0 |         0 |    0 |               0 |          0 | Requires tribe target validation    |
