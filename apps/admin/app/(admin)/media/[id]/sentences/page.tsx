import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// فعلاً نمایشی
export default function MediaSentencesPage() {
    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle>جملات</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">این صفحهٔ نمایشی جملات مدیا است.</p>
            </CardContent>
        </Card>
    )
}