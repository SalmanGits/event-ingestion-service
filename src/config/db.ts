import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.URI!)
        console.log('Databse Connected')
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

export default connectDB
