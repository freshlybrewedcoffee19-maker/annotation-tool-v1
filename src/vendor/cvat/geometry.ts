// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT
// Extracted from cvat-canvas/src/typescript/shared.ts at
// 454d60c31a59cb411d82660a3644e29d8fef7bb0. Type aliases inlined; algorithm unchanged.
export function clamp(x: number, min: number, max: number): number {
    return Math.min(Math.max(x, min), max);
}
export function computeWrappingBox(points: ArrayLike<number>, margin = 0) {
    let xtl = Number.MAX_SAFE_INTEGER;
    let ytl = Number.MAX_SAFE_INTEGER;
    let xbr = Number.MIN_SAFE_INTEGER;
    let ybr = Number.MIN_SAFE_INTEGER;
    for (let i = 0; i < points.length; i += 2) {
        const [x, y] = [points[i], points[i + 1]];
        xtl = Math.min(xtl, x); ytl = Math.min(ytl, y);
        xbr = Math.max(xbr, x); ybr = Math.max(ybr, y);
    }
    const box = {xtl: xtl - margin, ytl: ytl - margin, xbr: xbr + margin, ybr: ybr + margin};
    return {...box, x: box.xtl, y: box.ytl, width: box.xbr - box.xtl, height: box.ybr - box.ytl};
}
