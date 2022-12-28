const num = 121
if(num.toString().split('')===num.toString().split('').reverse()){
    console.log(true)
}
else{
    console.log(false)
}
console.log(num.toString().split(''))
console.log(num.toString().split('').reverse())