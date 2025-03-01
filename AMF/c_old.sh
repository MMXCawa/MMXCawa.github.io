#!/bin/bash

echo "請輸入等級（可以是小數）："
read level

echo "是否為全完美？"
read is_perfect

if [ "$is_perfect" = "1" ]; then
    echo "請輸入完美次數："
    read perfect
    result=$(echo "$level * 100 + $perfect" | bc)
    echo "結果: $result"
else
    echo "請輸入空敲次數："
    read EE
    echo "請輸入太快次數："
    read early
    echo "請輸入太慢次數："
    read late
    echo "請輸入完美次數："
    read perfect
    echo "請輸入稍慢次數："
    read LPerfect
    echo "請輸入稍快次數："
    read EPerfect

    echo "請輸入X精准度（0到100之間）："
    read accuracy

    # 計算總物量（除了空敲以外的所有判定次數）
    total_notes=$(echo "$perfect + $EPerfect + $LPerfect + $early + $late" | bc)

    # 計算物量係數
    note_factor=$(echo "scale=4; 1 / (1 + 0.001 * $total_notes)" | bc)

    # 計算總分數
    score=$(echo "scale=2; ($perfect * 1 + $EPerfect * 0.8 + $LPerfect * 0.8 + $early * 0.5 + $late * 0.5 + $EE * 0.2) * ($accuracy / 100) * $note_factor" | bc)
    echo "總分數: $score"
fi