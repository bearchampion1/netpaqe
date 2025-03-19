function updateTime() {//現在時間
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById("time").textContent = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
setInterval(updateTime, 1000);
updateTime();

function toggleDropdown() {
    var menu = document.getElementById("dropdownMenu");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

// 點擊其他地方時關閉選單
document.addEventListener("click", function(event) {
    var dropdown = document.querySelector(".dropdown");
    if (!dropdown.contains(event.target)) {
        document.getElementById("dropdownMenu").style.display = "none";
    }
});