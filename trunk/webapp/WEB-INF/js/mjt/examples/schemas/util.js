//
//  util.js - utility functions
//


function commaFormatInteger(SS) {
    if (isNaN(parseInt(SS)) || SS==0) {return "-";}
    var T = "", S = String(SS), L = S.length - 1, C, j;
    for (j = 0; j <= L; j++) {
        T += C = S.charAt(j);
        if (j < L && (L - j) % 3 == 0 && C != "-") {
            T += ",";
        }
    }
    return T;
}